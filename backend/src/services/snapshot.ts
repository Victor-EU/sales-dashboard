import { query, getClient } from "../db/index.js";
import { logger } from "../logger.js";
import { hubspotService } from "./hubspot.js";
import { exchangeRateService } from "./exchange-rates.js";
import {
  calculateDealHealth,
  calculateDaysInStage,
  getStageEnteredDate,
} from "./health.js";
import {
  getCurrentWeek,
  getPreviousWeek,
  getWeekIdForDate,
  weeksBetween,
} from "./week.js";
import { STAGE_ORDER, ALL_STAGES, FUNNEL_STAGES } from "./constants.js";
import type {
  Deal,
  HubSpotDeal,
  StageCategory,
  MovementType,
  WeekInfo,
} from "../types/index.js";

interface ProcessedDeal extends Deal {
  prevWeekStageId: string | null;
  prevWeekValue: number | null;
  stageChanged: boolean;
  valueChanged: number | null;
  createdWeek: string;
  weeksSinceCreated: number;
  contractStartDate: Date | null;
}

class SnapshotService {
  /** Create a weekly snapshot */
  async createSnapshot(weekInfo?: WeekInfo): Promise<number> {
    const week = weekInfo || getCurrentWeek();
    const startTime = Date.now();

    logger.info(`Creating snapshot for ${week.weekId}...`);

    const client = await getClient();

    try {
      await client.query("BEGIN");

      // Create or update snapshot run record
      const snapshotRunResult = await client.query<{ id: number }>(
        `INSERT INTO snapshot_runs (
          week_id, week_number, year, week_start_date, week_end_date,
          snapshot_date, snapshot_taken_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'running')
        ON CONFLICT (week_id) DO UPDATE SET
          snapshot_taken_at = NOW(),
          status = 'running',
          retry_count = snapshot_runs.retry_count + 1
        RETURNING id`,
        [
          week.weekId,
          week.weekNumber,
          week.year,
          week.startDate,
          week.endDate,
          new Date(),
        ]
      );

      const snapshotRunId = snapshotRunResult.rows[0].id;

      // Refresh HubSpot caches
      await hubspotService.refreshCaches();

      // Ensure we have exchange rates for relevant months
      // Fetch rates for current year and previous year to cover all deals
      const currentYear = new Date().getFullYear();
      logger.info("Fetching exchange rates...");
      await exchangeRateService.ensureRatesForYear(currentYear);
      await exchangeRateService.ensureRatesForYear(currentYear - 1);

      // Fetch all deals from HubSpot
      const hubspotDeals = await hubspotService.getAllDeals();

      // Get previous week data for comparison
      const prevWeek = getPreviousWeek(week.weekId);
      const prevWeekDeals = prevWeek
        ? await this.getPreviousWeekDeals(prevWeek.weekId)
        : new Map<string, { stageId: string; value: number }>();

      // Process deals
      const processedDeals = await this.processDeals(
        hubspotDeals,
        prevWeekDeals,
        week
      );

      // Clear existing data for this week (in case of re-run)
      await client.query(
        `DELETE FROM deal_weekly_snapshots WHERE week_id = $1`,
        [week.weekId]
      );
      await client.query(
        `DELETE FROM weekly_stage_snapshots WHERE week_id = $1`,
        [week.weekId]
      );
      await client.query(`DELETE FROM deal_stage_movements WHERE week_id = $1`, [
        week.weekId,
      ]);

      // Save deal snapshots
      await this.saveDealSnapshots(client, snapshotRunId, week, processedDeals);

      // Calculate and save stage aggregates
      await this.saveStageSnapshots(
        client,
        snapshotRunId,
        week,
        processedDeals,
        prevWeek
      );

      // Calculate and save movements
      const movementsCount = await this.saveMovements(
        client,
        snapshotRunId,
        week,
        processedDeals
      );

      // Update snapshot run with summary
      const totalValue = processedDeals
        .filter((d) => FUNNEL_STAGES.includes(d.stageCategory))
        .reduce((sum, d) => sum + d.value, 0);

      const durationSeconds = Math.round((Date.now() - startTime) / 1000);

      await client.query(
        `UPDATE snapshot_runs SET
          status = 'completed',
          duration_seconds = $2,
          total_deals = $3,
          total_value = $4,
          deals_moved = $5
        WHERE id = $1`,
        [
          snapshotRunId,
          durationSeconds,
          processedDeals.length,
          totalValue,
          movementsCount,
        ]
      );

      await client.query("COMMIT");

      logger.info(
        `Snapshot ${week.weekId} completed: ${processedDeals.length} deals, ${movementsCount} movements, ${durationSeconds}s`
      );

      return snapshotRunId;
    } catch (error) {
      await client.query("ROLLBACK");

      // Update snapshot run with error
      await query(
        `UPDATE snapshot_runs SET
          status = 'failed',
          error_message = $2,
          duration_seconds = $3
        WHERE week_id = $1`,
        [
          week.weekId,
          error instanceof Error ? error.message : "Unknown error",
          Math.round((Date.now() - startTime) / 1000),
        ]
      );

      logger.error(`Snapshot ${week.weekId} failed`, { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /** Process HubSpot deals into internal format */
  private async processDeals(
    hubspotDeals: HubSpotDeal[],
    prevWeekDeals: Map<string, { stageId: string; value: number }>,
    week: WeekInfo
  ): Promise<ProcessedDeal[]> {
    const deals: ProcessedDeal[] = [];

    for (const hsDeal of hubspotDeals) {
      const props = hsDeal.properties;

      // Skip deals without a stage
      if (!props.dealstage) {
        logger.debug(`Skipping deal ${hsDeal.id} - no stage assigned`);
        continue;
      }

      // Get stage info
      const stageId = props.dealstage;
      const stageInfo = await hubspotService.getStageInfo(stageId);
      const stageCategory = stageInfo?.category || "MQL";
      const stageName = stageInfo?.name || stageId;

      // Get pipeline info
      const pipelineId = props.pipeline;
      const pipelineInfo = await hubspotService.getPipelineInfo(pipelineId);
      const pipelineName = pipelineInfo?.name || "Default";

      // Get owner info
      const ownerId = props.hubspot_owner_id;
      const ownerName = await hubspotService.getOwnerName(ownerId);

      // Parse dates
      const createdDate = new Date(props.createdate);
      const closeDate = props.closedate ? new Date(props.closedate) : null;
      const contractStartDate = props.license_subscription_start
        ? new Date(props.license_subscription_start)
        : null;
      const lastModifiedDate = new Date(props.hs_lastmodifieddate);

      // Get stage entry date
      const stageEnteredDate = getStageEnteredDate(
        stageId,
        props as unknown as Record<string, string | null | undefined>
      );
      const daysInStage = calculateDaysInStage(stageEnteredDate, createdDate);

      // Calculate health
      const { status: health, reasons: healthReasons } = calculateDealHealth({
        stageCategory,
        daysInStage,
        closeDate,
        lastModifiedDate,
      });

      // Get local currency value - use 'amount' field for both storage and conversion
      const localAmount = parseFloat(props.amount || "0") || 0;
      const currency = props.deal_currency_code || "USD";
      const arrLocal = localAmount; // Store the same value we use for conversion

      // Convert to USD using exchange rate for the deal's creation month
      // If arr___usd_ is set in HubSpot, use it; otherwise convert local amount
      let value: number;
      if (props.arr___usd_) {
        value = parseFloat(props.arr___usd_);
      } else {
        value = await exchangeRateService.convertToUsd(localAmount, currency, createdDate);
      }

      // Previous week comparison
      const prevWeekData = prevWeekDeals.get(hsDeal.id);
      const prevWeekStageId = prevWeekData?.stageId || null;
      const prevWeekValue = prevWeekData?.value ?? null;
      const stageChanged = prevWeekStageId !== null && prevWeekStageId !== stageId;
      const valueChanged =
        prevWeekValue !== null ? value - prevWeekValue : null;

      // Week tracking
      const createdWeek = getWeekIdForDate(createdDate);
      const weeksSinceCreated = weeksBetween(createdDate, week.startDate);

      deals.push({
        id: hsDeal.id,
        name: props.dealname,
        customerName: props.end_customer_name_synch,
        value,
        arrLocal,
        currency: props.deal_currency_code,
        stageId,
        stageName,
        stageCategory,
        pipelineId,
        pipelineName,
        ownerId,
        ownerName,
        createdDate,
        closeDate,
        contractStartDate,
        lastModifiedDate,
        daysInStage,
        stageEnteredDate,
        health,
        healthReasons,
        prevWeekStageId,
        prevWeekValue,
        stageChanged,
        valueChanged,
        createdWeek,
        weeksSinceCreated,
      });
    }

    return deals;
  }

  /** Get previous week deal data for comparison */
  private async getPreviousWeekDeals(
    weekId: string
  ): Promise<Map<string, { stageId: string; value: number }>> {
    const result = await query<{
      deal_id: string;
      stage_id: string;
      arr_usd: string;
    }>(
      `SELECT deal_id, stage_id, arr_usd FROM deal_weekly_snapshots WHERE week_id = $1`,
      [weekId]
    );

    const map = new Map<string, { stageId: string; value: number }>();
    for (const row of result.rows) {
      map.set(row.deal_id, {
        stageId: row.stage_id,
        value: parseFloat(row.arr_usd) || 0,
      });
    }

    return map;
  }

  /** Save individual deal snapshots */
  private async saveDealSnapshots(
    client: ReturnType<typeof getClient> extends Promise<infer T> ? T : never,
    snapshotRunId: number,
    week: WeekInfo,
    deals: ProcessedDeal[]
  ): Promise<void> {
    for (const deal of deals) {
      await client.query(
        `INSERT INTO deal_weekly_snapshots (
          snapshot_run_id, week_id, week_start_date, deal_id, deal_name,
          end_customer_name, pipeline_id, pipeline_name, stage_id, stage_name,
          stage_category, amount, arr_usd, arr_local, currency, owner_id,
          owner_name, created_date, close_date, contract_start_date, last_modified_date,
          days_in_current_stage, stage_entered_date, prev_week_stage_id,
          prev_week_value, stage_changed, value_changed, created_week,
          weeks_since_created, health_status, health_reasons
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
        )`,
        [
          snapshotRunId,
          week.weekId,
          week.startDate,
          deal.id,
          deal.name,
          deal.customerName,
          deal.pipelineId,
          deal.pipelineName,
          deal.stageId,
          deal.stageName,
          deal.stageCategory,
          deal.value,
          deal.value,
          deal.arrLocal,
          deal.currency,
          deal.ownerId,
          deal.ownerName,
          deal.createdDate,
          deal.closeDate,
          deal.contractStartDate,
          deal.lastModifiedDate,
          deal.daysInStage,
          deal.stageEnteredDate,
          deal.prevWeekStageId,
          deal.prevWeekValue,
          deal.stageChanged,
          deal.valueChanged,
          deal.createdWeek,
          deal.weeksSinceCreated,
          deal.health,
          deal.healthReasons,
        ]
      );
    }
  }

  /** Save stage aggregate snapshots */
  private async saveStageSnapshots(
    client: ReturnType<typeof getClient> extends Promise<infer T> ? T : never,
    snapshotRunId: number,
    week: WeekInfo,
    deals: ProcessedDeal[],
    prevWeek: WeekInfo | null
  ): Promise<void> {
    // Get previous week stage data
    const prevStageData = prevWeek
      ? await this.getPreviousStageData(prevWeek.weekId)
      : new Map<StageCategory, { value: number; logos: number; arpa: number }>();

    // Group deals by stage category
    const stageGroups = new Map<StageCategory, ProcessedDeal[]>();
    for (const stage of ALL_STAGES) {
      stageGroups.set(stage, []);
    }

    for (const deal of deals) {
      const group = stageGroups.get(deal.stageCategory);
      if (group) {
        group.push(deal);
      }
    }

    // Calculate and save each stage
    for (const [category, stageDeals] of stageGroups) {
      const totalValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
      const logoCount = stageDeals.length;
      const arpa = logoCount > 0 ? totalValue / logoCount : 0;

      // Previous week comparison
      const prev = prevStageData.get(category);
      const prevValue = prev?.value ?? null;
      const prevLogos = prev?.logos ?? null;
      const prevArpa = prev?.arpa ?? null;
      const valueChange = prevValue !== null ? totalValue - prevValue : null;
      const logoChange = prevLogos !== null ? logoCount - prevLogos : null;
      const arpaChange = prevArpa !== null ? arpa - prevArpa : null;
      const valueChangePct =
        prevValue && prevValue > 0 ? (valueChange! / prevValue) * 100 : null;

      // Count deals entered/exited this stage
      let dealsEntered = 0;
      let dealsExited = 0;
      let valueEntered = 0;
      let valueExited = 0;

      for (const deal of stageDeals) {
        if (deal.prevWeekStageId === null) {
          // New deal
          dealsEntered++;
          valueEntered += deal.value;
        } else if (deal.stageChanged) {
          // Moved into this stage from another
          dealsEntered++;
          valueEntered += deal.value;
        }
      }

      // Count deals that left this stage
      for (const deal of deals) {
        if (
          deal.prevWeekStageId &&
          hubspotService.getStageCategory(deal.prevWeekStageId) === category &&
          deal.stageCategory !== category
        ) {
          dealsExited++;
          valueExited += deal.value;
        }
      }

      // Calculate average days in stage
      const daysInStageValues = stageDeals.map((d) => d.daysInStage);
      const avgDaysInStage =
        daysInStageValues.length > 0
          ? daysInStageValues.reduce((a, b) => a + b, 0) /
            daysInStageValues.length
          : null;

      await client.query(
        `INSERT INTO weekly_stage_snapshots (
          snapshot_run_id, week_id, week_start_date, week_end_date,
          week_number, year, pipeline_id, pipeline_name, stage_id,
          stage_name, stage_category, total_value, logo_count, arpa,
          prev_week_value, prev_week_logos, prev_week_arpa, value_change,
          logo_change, arpa_change, value_change_pct, deals_entered,
          deals_exited, value_entered, value_exited, avg_days_in_stage
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
        )`,
        [
          snapshotRunId,
          week.weekId,
          week.startDate,
          week.endDate,
          week.weekNumber,
          week.year,
          "default",
          "New Business",
          category.toLowerCase(),
          category,
          category,
          totalValue,
          logoCount,
          arpa,
          prevValue,
          prevLogos,
          prevArpa,
          valueChange,
          logoChange,
          arpaChange,
          valueChangePct,
          dealsEntered,
          dealsExited,
          valueEntered,
          valueExited,
          avgDaysInStage,
        ]
      );
    }
  }

  /** Get previous week stage aggregate data */
  private async getPreviousStageData(
    weekId: string
  ): Promise<Map<StageCategory, { value: number; logos: number; arpa: number }>> {
    const result = await query<{
      stage_category: string;
      total_value: string;
      logo_count: number;
      arpa: string;
    }>(
      `SELECT stage_category, total_value, logo_count, arpa
       FROM weekly_stage_snapshots WHERE week_id = $1`,
      [weekId]
    );

    const map = new Map<
      StageCategory,
      { value: number; logos: number; arpa: number }
    >();
    for (const row of result.rows) {
      map.set(row.stage_category as StageCategory, {
        value: parseFloat(row.total_value) || 0,
        logos: row.logo_count,
        arpa: parseFloat(row.arpa) || 0,
      });
    }

    return map;
  }

  /** Save deal movements */
  private async saveMovements(
    client: ReturnType<typeof getClient> extends Promise<infer T> ? T : never,
    snapshotRunId: number,
    week: WeekInfo,
    deals: ProcessedDeal[]
  ): Promise<number> {
    let count = 0;

    for (const deal of deals) {
      let movementType: MovementType | null = null;
      let isForward: boolean | null = null;
      let stagesSkipped = 0;

      if (deal.prevWeekStageId === null) {
        // New deal this week
        movementType = "NEW_DEAL";
        isForward = true;
      } else if (deal.stageChanged) {
        const fromCategory = hubspotService.getStageCategory(deal.prevWeekStageId);
        const toCategory = deal.stageCategory;

        const fromOrder = STAGE_ORDER[fromCategory];
        const toOrder = STAGE_ORDER[toCategory];

        if (toCategory === "WON") {
          movementType = "WON";
          isForward = true;
        } else if (toCategory === "LOST") {
          movementType = "LOST";
          isForward = false;
        } else if (fromCategory === "LOST" && FUNNEL_STAGES.includes(toCategory)) {
          movementType = "RESURRECTED";
          isForward = true;
        } else if (toOrder > fromOrder) {
          stagesSkipped = toOrder - fromOrder - 1;
          movementType = stagesSkipped > 0 ? "SKIP_FORWARD" : "FORWARD";
          isForward = true;
        } else if (toOrder < fromOrder) {
          movementType = "BACKWARD";
          isForward = false;
        }
      }

      if (movementType) {
        const fromStageInfo = deal.prevWeekStageId
          ? await hubspotService.getStageInfo(deal.prevWeekStageId)
          : null;

        await client.query(
          `INSERT INTO deal_stage_movements (
            snapshot_run_id, week_id, deal_id, deal_name, end_customer_name,
            from_stage_id, from_stage_name, from_stage_category,
            to_stage_id, to_stage_name, to_stage_category,
            movement_type, is_forward, stages_skipped, deal_value,
            value_change, owner_id, owner_name, days_in_prev_stage,
            deal_age_weeks
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19, $20
          )`,
          [
            snapshotRunId,
            week.weekId,
            deal.id,
            deal.name,
            deal.customerName,
            deal.prevWeekStageId,
            fromStageInfo?.name,
            fromStageInfo?.category,
            deal.stageId,
            deal.stageName,
            deal.stageCategory,
            movementType,
            isForward,
            stagesSkipped,
            deal.value,
            deal.valueChanged,
            deal.ownerId,
            deal.ownerName,
            deal.daysInStage,
            deal.weeksSinceCreated,
          ]
        );

        count++;
      }
    }

    return count;
  }
}

export const snapshotService = new SnapshotService();
export default snapshotService;
