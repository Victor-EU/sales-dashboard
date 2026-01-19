import { query } from "../db/index.js";
import { hubspotService } from "./hubspot.js";
import {
  calculateDealHealth,
  calculateDaysInStage,
  getStageEnteredDate,
} from "./health.js";
import { FUNNEL_STAGES } from "./constants.js";
import type { Deal, HubSpotDeal } from "../types/index.js";

class DealsService {
  /** Get current deals directly from HubSpot (live data) */
  async getCurrentDeals(): Promise<Deal[]> {
    const hubspotDeals = await hubspotService.getAllDeals();
    return this.processDeals(hubspotDeals);
  }

  /** Get deals from a specific week's snapshot */
  async getDealsForWeek(weekId: string): Promise<Deal[]> {
    const result = await query<{
      deal_id: string;
      deal_name: string;
      end_customer_name: string | null;
      arr_usd: string;
      arr_local: string | null;
      currency: string | null;
      stage_id: string;
      stage_name: string;
      stage_category: string;
      pipeline_id: string;
      pipeline_name: string;
      owner_id: string | null;
      owner_name: string | null;
      created_date: Date;
      close_date: Date | null;
      contract_start_date: Date | null;
      last_modified_date: Date;
      days_in_current_stage: number;
      stage_entered_date: Date | null;
      health_status: string;
      health_reasons: string[] | null;
    }>(
      `SELECT * FROM deal_weekly_snapshots WHERE week_id = $1`,
      [weekId]
    );

    return result.rows.map((row) => ({
      id: row.deal_id,
      name: row.deal_name,
      customerName: row.end_customer_name,
      value: parseFloat(row.arr_usd) || 0,
      arrLocal: row.arr_local ? parseFloat(row.arr_local) : null,
      currency: row.currency,
      stageId: row.stage_id,
      stageName: row.stage_name,
      stageCategory: row.stage_category as Deal["stageCategory"],
      pipelineId: row.pipeline_id,
      pipelineName: row.pipeline_name,
      ownerId: row.owner_id,
      ownerName: row.owner_name,
      createdDate: row.created_date,
      closeDate: row.close_date,
      contractStartDate: row.contract_start_date,
      lastModifiedDate: row.last_modified_date,
      daysInStage: row.days_in_current_stage,
      stageEnteredDate: row.stage_entered_date,
      health: row.health_status as Deal["health"],
      healthReasons: row.health_reasons || [],
    }));
  }

  /** Process HubSpot deals into internal format */
  private async processDeals(hubspotDeals: HubSpotDeal[]): Promise<Deal[]> {
    const deals: Deal[] = [];

    for (const hsDeal of hubspotDeals) {
      const props = hsDeal.properties;

      // Get stage info
      const stageId = props.dealstage;
      const stageInfo = await hubspotService.getStageInfo(stageId);
      const stageCategory = stageInfo?.category || "MQL";
      const stageName = stageInfo?.name || stageId;

      // Skip non-funnel deals if needed
      if (!FUNNEL_STAGES.includes(stageCategory) &&
          stageCategory !== "WON" &&
          stageCategory !== "LOST") {
        continue;
      }

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

      // Get value (prefer ARR USD, fallback to amount)
      const value = parseFloat(props.arr___usd_ || props.amount || "0") || 0;
      const arrLocal = props.arr ? parseFloat(props.arr) : null;

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
      });
    }

    return deals;
  }
}

export const dealsService = new DealsService();
export default dealsService;
