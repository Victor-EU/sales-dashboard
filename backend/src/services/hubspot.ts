import { Client } from "@hubspot/api-client";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { query } from "../db/index.js";
import {
  DEAL_PROPERTIES,
  STAGE_CATEGORY_MAP,
  STAGE_NAMES,
} from "./constants.js";
import type {
  HubSpotDeal,
  HubSpotOwner,
  HubSpotPipeline,
  HubSpotStage,
  StageCategory,
} from "../types/index.js";

class HubSpotService {
  private client: Client;
  private ownersCache: Map<string, HubSpotOwner> = new Map();
  private pipelinesCache: Map<string, HubSpotPipeline> = new Map();

  constructor() {
    this.client = new Client({ accessToken: config.hubspot.accessToken });
  }

  /** Fetch all deals from HubSpot with pagination */
  async getAllDeals(): Promise<HubSpotDeal[]> {
    const deals: HubSpotDeal[] = [];
    let after: string | undefined;
    const limit = 100;

    logger.info("Fetching deals from HubSpot...");

    try {
      do {
        const response = await this.client.crm.deals.basicApi.getPage(
          limit,
          after,
          DEAL_PROPERTIES,
          undefined,
          undefined,
          false
        );

        for (const deal of response.results) {
          deals.push({
            id: deal.id,
            properties: deal.properties as unknown as HubSpotDeal["properties"],
          });
        }

        after = response.paging?.next?.after;

        logger.debug(`Fetched ${deals.length} deals so far...`);
      } while (after);

      logger.info(`Successfully fetched ${deals.length} deals from HubSpot`);
      return deals;
    } catch (error) {
      logger.error("Failed to fetch deals from HubSpot", { error });
      throw error;
    }
  }

  /** Fetch all owners from HubSpot with pagination */
  async getAllOwners(): Promise<HubSpotOwner[]> {
    const owners: HubSpotOwner[] = [];
    let after: string | undefined;
    const limit = 100;

    logger.info("Fetching owners from HubSpot...");

    try {
      do {
        const response = await this.client.crm.owners.ownersApi.getPage(
          undefined,
          after,
          limit,
          false
        );

        for (const owner of response.results) {
          owners.push({
            id: owner.id,
            email: owner.email || "",
            firstName: owner.firstName || "",
            lastName: owner.lastName || "",
          });
        }

        after = response.paging?.next?.after;
        logger.debug(`Fetched ${owners.length} owners so far...`);
      } while (after);

      // Cache owners
      for (const owner of owners) {
        this.ownersCache.set(owner.id, owner);
      }

      // Persist to database
      await this.persistOwners(owners);

      logger.info(`Fetched ${owners.length} owners from HubSpot`);
      return owners;
    } catch (error) {
      logger.error("Failed to fetch owners from HubSpot", { error });
      throw error;
    }
  }

  /** Persist owners to database cache */
  private async persistOwners(owners: HubSpotOwner[]): Promise<void> {
    for (const owner of owners) {
      const fullName = `${owner.firstName} ${owner.lastName}`.trim();
      await query(
        `INSERT INTO hubspot_owners (id, email, first_name, last_name, full_name, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           full_name = EXCLUDED.full_name,
           updated_at = NOW()`,
        [owner.id, owner.email, owner.firstName, owner.lastName, fullName]
      );
    }
  }

  /** Get owner by ID (from cache or database) */
  async getOwnerById(ownerId: string): Promise<HubSpotOwner | null> {
    // Check memory cache first
    if (this.ownersCache.has(ownerId)) {
      return this.ownersCache.get(ownerId)!;
    }

    // Check database cache
    const result = await query<{
      id: string;
      email: string;
      first_name: string;
      last_name: string;
    }>(
      `SELECT id, email, first_name, last_name FROM hubspot_owners WHERE id = $1`,
      [ownerId]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      const owner: HubSpotOwner = {
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
      };
      this.ownersCache.set(ownerId, owner);
      return owner;
    }

    return null;
  }

  /** Get owner name by ID */
  async getOwnerName(ownerId: string | null): Promise<string | null> {
    if (!ownerId) return null;

    const owner = await this.getOwnerById(ownerId);
    if (!owner) return null;

    return `${owner.firstName} ${owner.lastName}`.trim() || owner.email;
  }

  /** Fetch all pipelines and stages from HubSpot */
  async getAllPipelines(): Promise<HubSpotPipeline[]> {
    logger.info("Fetching pipelines from HubSpot...");

    try {
      const response = await this.client.crm.pipelines.pipelinesApi.getAll(
        "deals"
      );

      const pipelines: HubSpotPipeline[] = response.results.map((pipeline) => ({
        id: pipeline.id,
        label: pipeline.label,
        stages: pipeline.stages.map((stage) => ({
          id: stage.id,
          label: stage.label,
          displayOrder: stage.displayOrder,
        })),
      }));

      // Cache and persist
      for (const pipeline of pipelines) {
        this.pipelinesCache.set(pipeline.id, pipeline);
      }
      await this.persistPipelines(pipelines);

      logger.info(`Fetched ${pipelines.length} pipelines from HubSpot`);
      return pipelines;
    } catch (error) {
      logger.error("Failed to fetch pipelines from HubSpot", { error });
      throw error;
    }
  }

  /** Persist pipelines to database cache */
  private async persistPipelines(pipelines: HubSpotPipeline[]): Promise<void> {
    for (const pipeline of pipelines) {
      await query(
        `INSERT INTO hubspot_pipelines (id, label, display_order, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (id) DO UPDATE SET
           label = EXCLUDED.label,
           display_order = EXCLUDED.display_order,
           updated_at = NOW()`,
        [pipeline.id, pipeline.label, 0]
      );

      for (const stage of pipeline.stages) {
        const category = this.getStageCategory(stage.id);
        await query(
          `INSERT INTO hubspot_stages (id, pipeline_id, label, display_order, category, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (id) DO UPDATE SET
             pipeline_id = EXCLUDED.pipeline_id,
             label = EXCLUDED.label,
             display_order = EXCLUDED.display_order,
             category = EXCLUDED.category,
             updated_at = NOW()`,
          [stage.id, pipeline.id, stage.label, stage.displayOrder, category]
        );
      }
    }
  }

  /** Get stage category from stage ID */
  getStageCategory(stageId: string): StageCategory {
    return STAGE_CATEGORY_MAP[stageId] || "MQL";
  }

  /** Get stage name from stage ID */
  getStageName(stageId: string): string {
    return STAGE_NAMES[stageId] || stageId;
  }

  /** Get stage info from database cache */
  async getStageInfo(
    stageId: string
  ): Promise<{ name: string; category: StageCategory } | null> {
    const result = await query<{ label: string; category: string }>(
      `SELECT label, category FROM hubspot_stages WHERE id = $1`,
      [stageId]
    );

    if (result.rows.length > 0) {
      return {
        name: result.rows[0].label,
        category: (result.rows[0].category as StageCategory) || "MQL",
      };
    }

    // Fallback to constants
    return {
      name: this.getStageName(stageId),
      category: this.getStageCategory(stageId),
    };
  }

  /** Get pipeline info from database cache */
  async getPipelineInfo(
    pipelineId: string
  ): Promise<{ name: string } | null> {
    const result = await query<{ label: string }>(
      `SELECT label FROM hubspot_pipelines WHERE id = $1`,
      [pipelineId]
    );

    if (result.rows.length > 0) {
      return { name: result.rows[0].label };
    }

    return null;
  }

  /** Refresh all HubSpot caches */
  async refreshCaches(): Promise<void> {
    logger.info("Refreshing HubSpot caches...");
    await Promise.all([this.getAllOwners(), this.getAllPipelines()]);
    logger.info("HubSpot caches refreshed");
  }
}

export const hubspotService = new HubSpotService();
export default hubspotService;
