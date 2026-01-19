import { Router, type Request, type Response } from "express";
import { query } from "../db/index.js";
import { logger } from "../logger.js";
import { FUNNEL_STAGES, ALL_STAGES } from "../services/constants.js";
import type { StageCategory, StageMetrics } from "../types/index.js";

const router = Router();

/** Parse period parameter into date range */
function parsePeriod(period: string): { startDate: Date; endDate: Date } | null {
  // Support year format: "2025"
  if (/^\d{4}$/.test(period)) {
    const year = parseInt(period);
    return {
      startDate: new Date(year, 0, 1), // Jan 1
      endDate: new Date(year, 11, 31, 23, 59, 59), // Dec 31
    };
  }

  // Support quarter format: "2025-Q1"
  const quarterMatch = period.match(/^(\d{4})-Q([1-4])$/);
  if (quarterMatch) {
    const year = parseInt(quarterMatch[1]);
    const quarter = parseInt(quarterMatch[2]);
    const startMonth = (quarter - 1) * 3;
    return {
      startDate: new Date(year, startMonth, 1),
      endDate: new Date(year, startMonth + 3, 0, 23, 59, 59),
    };
  }

  // Support date range: "2025-01-01:2025-06-30"
  const rangeMatch = period.match(/^(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/);
  if (rangeMatch) {
    return {
      startDate: new Date(rangeMatch[1]),
      endDate: new Date(rangeMatch[2] + "T23:59:59"),
    };
  }

  return null;
}

/**
 * GET /api/scoped-metrics/:weekId
 * Get metrics for a specific week, scoped by period
 *
 * Query parameters:
 * - period: Year (2025), Quarter (2025-Q1), or date range (2025-01-01:2025-06-30)
 * - pipeline: Optional pipeline filter (default: "New Business")
 *
 * Scoping rules:
 * - Pipeline (MQL, SAL, SQL): Filter by deal created_date
 * - ARR: Filter by contract_start_date
 * - Win Rate: Filter by close_date for WON deals
 */
router.get("/:weekId", async (req: Request, res: Response) => {
  try {
    const weekId = req.params.weekId as string;
    const period = req.query.period as string;
    const pipeline = (req.query.pipeline as string) || "New Business"; // Default to New Business

    if (!period) {
      res.status(400).json({ error: "period parameter is required" });
      return;
    }

    const dateRange = parsePeriod(period);
    if (!dateRange) {
      res.status(400).json({
        error: "Invalid period format. Use: YYYY, YYYY-QN, or YYYY-MM-DD:YYYY-MM-DD",
      });
      return;
    }

    logger.info(`Fetching scoped metrics for ${weekId}, period: ${period}, pipeline: ${pipeline}`);

    // Get pipeline metrics (scoped by created_date, filtered by pipeline)
    const pipelineResult = await query<{
      stage_category: string;
      total_value: string;
      logo_count: string;
    }>(
      `SELECT stage_category,
              SUM(arr_usd) as total_value,
              COUNT(*) as logo_count
       FROM deal_weekly_snapshots
       WHERE week_id = $1
         AND pipeline_name = $4
         AND stage_category IN ('MQL', 'SAL', 'SQL')
         AND created_date >= $2
         AND created_date <= $3
       GROUP BY stage_category`,
      [weekId, dateRange.startDate, dateRange.endDate, pipeline]
    );

    // Get WON metrics (scoped by close_date, filtered by pipeline)
    const wonResult = await query<{
      total_value: string;
      logo_count: string;
    }>(
      `SELECT SUM(arr_usd) as total_value,
              COUNT(*) as logo_count
       FROM deal_weekly_snapshots
       WHERE week_id = $1
         AND pipeline_name = $4
         AND stage_category = 'WON'
         AND close_date >= $2
         AND close_date <= $3`,
      [weekId, dateRange.startDate, dateRange.endDate, pipeline]
    );

    // Get LOST metrics (scoped by close_date, filtered by pipeline)
    const lostResult = await query<{
      total_value: string;
      logo_count: string;
    }>(
      `SELECT SUM(arr_usd) as total_value,
              COUNT(*) as logo_count
       FROM deal_weekly_snapshots
       WHERE week_id = $1
         AND pipeline_name = $4
         AND stage_category = 'LOST'
         AND close_date >= $2
         AND close_date <= $3`,
      [weekId, dateRange.startDate, dateRange.endDate, pipeline]
    );

    // Get ARR metrics (scoped by contract_start_date, filtered by pipeline)
    const arrResult = await query<{
      total_arr: string;
      logo_count: string;
    }>(
      `SELECT SUM(arr_usd) as total_arr,
              COUNT(*) as logo_count
       FROM deal_weekly_snapshots
       WHERE week_id = $1
         AND pipeline_name = $4
         AND stage_category = 'WON'
         AND contract_start_date >= $2
         AND contract_start_date <= $3`,
      [weekId, dateRange.startDate, dateRange.endDate, pipeline]
    );

    // Build stage metrics
    const stageMap = new Map<StageCategory, { value: number; logos: number }>();

    // Initialize all stages with zeros
    for (const stage of ALL_STAGES) {
      stageMap.set(stage, { value: 0, logos: 0 });
    }

    // Fill in pipeline stages from query
    for (const row of pipelineResult.rows) {
      const category = row.stage_category as StageCategory;
      stageMap.set(category, {
        value: parseFloat(row.total_value) || 0,
        logos: parseInt(row.logo_count) || 0,
      });
    }

    // Fill in WON/LOST from their respective queries
    if (wonResult.rows[0]) {
      stageMap.set("WON", {
        value: parseFloat(wonResult.rows[0].total_value) || 0,
        logos: parseInt(wonResult.rows[0].logo_count) || 0,
      });
    }

    if (lostResult.rows[0]) {
      stageMap.set("LOST", {
        value: parseFloat(lostResult.rows[0].total_value) || 0,
        logos: parseInt(lostResult.rows[0].logo_count) || 0,
      });
    }

    // Build response
    const stages: StageMetrics[] = ALL_STAGES.map((category) => {
      const data = stageMap.get(category)!;
      return {
        stage: category,
        value: data.value,
        logos: data.logos,
        arpa: data.logos > 0 ? data.value / data.logos : 0,
        prevValue: null,
        prevLogos: null,
        prevArpa: null,
        valueChange: null,
        logosChange: null,
        arpaChange: null,
        valueChangePct: null,
        dealsEntered: 0,
        dealsExited: 0,
      };
    });

    // Calculate totals for funnel stages only (MQL, SAL, SQL)
    const funnelStages = stages.filter((s) => FUNNEL_STAGES.includes(s.stage));
    const totalValue = funnelStages.reduce((sum, s) => sum + s.value, 0);
    const totalLogos = funnelStages.reduce((sum, s) => sum + s.logos, 0);
    const arpa = totalLogos > 0 ? totalValue / totalLogos : 0;

    // Calculate win rate (WON / (Pipeline + WON))
    const wonData = stageMap.get("WON")!;
    const winRate =
      totalValue + wonData.value > 0
        ? (wonData.value / (totalValue + wonData.value)) * 100
        : 0;

    // ARR for the period (contracts starting in the period)
    const scopedArr = arrResult.rows[0]
      ? parseFloat(arrResult.rows[0].total_arr) || 0
      : 0;
    const scopedArrLogos = arrResult.rows[0]
      ? parseInt(arrResult.rows[0].logo_count) || 0
      : 0;

    res.json({
      weekId,
      period,
      pipelineName: pipeline,
      periodStart: dateRange.startDate.toISOString().split("T")[0],
      periodEnd: dateRange.endDate.toISOString().split("T")[0],
      // Pipeline metrics (scoped by created_date)
      pipeline: {
        totalValue,
        totalLogos,
        arpa,
        stages,
      },
      // ARR metrics (scoped by contract_start_date)
      arr: {
        value: scopedArr,
        logos: scopedArrLogos,
        arpa: scopedArrLogos > 0 ? scopedArr / scopedArrLogos : 0,
      },
      // Win rate (scoped by close_date)
      winRate: {
        rate: winRate,
        wonValue: wonData.value,
        wonLogos: wonData.logos,
        lostValue: stageMap.get("LOST")!.value,
        lostLogos: stageMap.get("LOST")!.logos,
      },
    });
  } catch (error) {
    logger.error("Failed to get scoped metrics", { error });
    res.status(500).json({ error: "Failed to get scoped metrics" });
  }
});

/**
 * GET /api/scoped-metrics/:weekId/deals
 * Get deals list filtered by scope
 *
 * Query parameters:
 * - period: Year, Quarter, or date range
 * - scope: "pipeline" (created_date), "arr" (contract_start_date), "winrate" (close_date)
 * - stage: Optional stage filter (MQL, SAL, SQL, WON, LOST)
 */
router.get("/:weekId/deals", async (req: Request, res: Response) => {
  try {
    const weekId = req.params.weekId as string;
    const period = req.query.period as string;
    const scope = (req.query.scope as string) || "pipeline";
    const stage = req.query.stage as string | undefined;

    if (!period) {
      res.status(400).json({ error: "period parameter is required" });
      return;
    }

    const dateRange = parsePeriod(period);
    if (!dateRange) {
      res.status(400).json({
        error: "Invalid period format. Use: YYYY, YYYY-QN, or YYYY-MM-DD:YYYY-MM-DD",
      });
      return;
    }

    // Determine which date field to filter by
    let dateField: string;
    switch (scope) {
      case "arr":
        dateField = "contract_start_date";
        break;
      case "winrate":
        dateField = "close_date";
        break;
      case "pipeline":
      default:
        dateField = "created_date";
        break;
    }

    // Build query
    let sql = `
      SELECT deal_id, deal_name, end_customer_name, arr_usd, stage_category,
             pipeline_name, owner_name, created_date, close_date, contract_start_date
      FROM deal_weekly_snapshots
      WHERE week_id = $1
        AND ${dateField} >= $2
        AND ${dateField} <= $3
    `;
    const params: (string | Date)[] = [weekId, dateRange.startDate, dateRange.endDate];

    // Add stage filter if specified
    if (stage) {
      sql += ` AND stage_category = $4`;
      params.push(stage.toUpperCase());
    }

    sql += ` ORDER BY arr_usd DESC LIMIT 100`;

    const result = await query<{
      deal_id: string;
      deal_name: string;
      end_customer_name: string | null;
      arr_usd: string;
      stage_category: string;
      pipeline_name: string;
      owner_name: string | null;
      created_date: Date;
      close_date: Date | null;
      contract_start_date: Date | null;
    }>(sql, params);

    const deals = result.rows.map((row) => ({
      id: row.deal_id,
      name: row.deal_name,
      customerName: row.end_customer_name,
      value: parseFloat(row.arr_usd) || 0,
      stage: row.stage_category,
      pipeline: row.pipeline_name,
      owner: row.owner_name,
      createdDate: row.created_date?.toISOString().split("T")[0] || null,
      closeDate: row.close_date?.toISOString().split("T")[0] || null,
      contractStartDate:
        row.contract_start_date?.toISOString().split("T")[0] || null,
    }));

    res.json({
      weekId,
      period,
      scope,
      stage: stage || null,
      deals,
      totalCount: deals.length,
    });
  } catch (error) {
    logger.error("Failed to get scoped deals", { error });
    res.status(500).json({ error: "Failed to get scoped deals" });
  }
});

export default router;
