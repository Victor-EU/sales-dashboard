import { Router, type Request, type Response } from "express";
import { query } from "../db/index.js";
import { logger } from "../logger.js";
import { schedulerService } from "../services/scheduler.js";
import { hubspotService } from "../services/hubspot.js";
import { parseWeekId, getCurrentWeek } from "../services/week.js";
import { ALL_STAGES, FUNNEL_STAGES, SALES_PIPELINES } from "../services/constants.js";
import type {
  DashboardMetrics,
  StageMetrics,
  StageCategory,
} from "../types/index.js";

const router = Router();

/** GET /api/snapshots - List available snapshots */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await query<{
      week_id: string;
      week_number: number;
      year: number;
      week_start_date: Date;
      week_end_date: Date;
      snapshot_taken_at: Date;
      status: string;
      total_deals: number;
      total_value: string;
    }>(
      `SELECT week_id, week_number, year, week_start_date, week_end_date,
              snapshot_taken_at, status, total_deals, total_value
       FROM snapshot_runs
       WHERE status = 'completed'
       ORDER BY week_id DESC
       LIMIT 52`
    );

    const snapshots = result.rows.map((row) => ({
      weekId: row.week_id,
      weekNumber: row.week_number,
      year: row.year,
      weekStart: row.week_start_date.toISOString().split("T")[0],
      weekEnd: row.week_end_date.toISOString().split("T")[0],
      snapshotTakenAt: row.snapshot_taken_at,
      status: row.status,
      totalDeals: row.total_deals,
      totalValue: parseFloat(row.total_value) || 0,
    }));

    res.json({ snapshots });
  } catch (error) {
    logger.error("Failed to list snapshots", { error });
    res.status(500).json({ error: "Failed to list snapshots" });
  }
});

/** GET /api/snapshots/current - Get current week snapshot ID */
router.get("/current", async (_req: Request, res: Response) => {
  try {
    const current = getCurrentWeek();

    // Check if snapshot exists for current week
    const result = await query<{ week_id: string; status: string }>(
      `SELECT week_id, status FROM snapshot_runs WHERE week_id = $1`,
      [current.weekId]
    );

    if (result.rows.length > 0 && result.rows[0].status === "completed") {
      res.json({ weekId: current.weekId, exists: true });
    } else {
      // Find most recent completed snapshot
      const recent = await query<{ week_id: string }>(
        `SELECT week_id FROM snapshot_runs
         WHERE status = 'completed'
         ORDER BY week_id DESC
         LIMIT 1`
      );

      res.json({
        weekId: recent.rows[0]?.week_id || current.weekId,
        exists: false,
        currentWeek: current.weekId,
      });
    }
  } catch (error) {
    logger.error("Failed to get current snapshot", { error });
    res.status(500).json({ error: "Failed to get current snapshot" });
  }
});

/** GET /api/snapshots/:weekId - Get snapshot metrics for a week */
router.get("/:weekId", async (req: Request, res: Response) => {
  try {
    const weekId = req.params.weekId as string;
    const weekInfo = parseWeekId(weekId);

    if (!weekInfo) {
      res.status(400).json({ error: "Invalid week ID format" });
      return;
    }

    logger.info(`Fetching snapshot metrics for ${weekId}, pipelines: ${SALES_PIPELINES.join(", ")}`);

    // Query directly from deal_weekly_snapshots filtered by SALES_PIPELINES
    // This ensures we only count New Business + Partnership Deals
    const stageResult = await query<{
      stage_category: string;
      total_value: string;
      logo_count: string;
    }>(
      `SELECT stage_category,
              SUM(arr_usd) as total_value,
              COUNT(*) as logo_count
       FROM deal_weekly_snapshots
       WHERE week_id = $1
         AND pipeline_name = ANY($2)
       GROUP BY stage_category`,
      [weekId, SALES_PIPELINES]
    );

    if (stageResult.rows.length === 0) {
      res.status(404).json({ error: "Snapshot not found" });
      return;
    }

    // Get previous week data for comparison
    const prevWeekResult = await query<{
      stage_category: string;
      total_value: string;
      logo_count: string;
    }>(
      `SELECT stage_category,
              SUM(arr_usd) as total_value,
              COUNT(*) as logo_count
       FROM deal_weekly_snapshots
       WHERE week_id = (
         SELECT MAX(week_id) FROM deal_weekly_snapshots
         WHERE week_id < $1
       )
         AND pipeline_name = ANY($2)
       GROUP BY stage_category`,
      [weekId, SALES_PIPELINES]
    );

    // Build stage metrics map
    const stageMap = new Map<StageCategory, { value: number; logos: number }>();
    const prevStageMap = new Map<StageCategory, { value: number; logos: number }>();

    // Initialize all stages with zeros
    for (const stage of ALL_STAGES) {
      stageMap.set(stage, { value: 0, logos: 0 });
      prevStageMap.set(stage, { value: 0, logos: 0 });
    }

    // Fill in current week data
    for (const row of stageResult.rows) {
      const category = row.stage_category as StageCategory;
      stageMap.set(category, {
        value: parseFloat(row.total_value) || 0,
        logos: parseInt(row.logo_count) || 0,
      });
    }

    // Fill in previous week data
    for (const row of prevWeekResult.rows) {
      const category = row.stage_category as StageCategory;
      prevStageMap.set(category, {
        value: parseFloat(row.total_value) || 0,
        logos: parseInt(row.logo_count) || 0,
      });
    }

    // Build stage metrics array
    const stages: StageMetrics[] = ALL_STAGES.map((category) => {
      const current = stageMap.get(category)!;
      const prev = prevStageMap.get(category)!;
      const valueChange = current.value - prev.value;
      const logosChange = current.logos - prev.logos;
      const arpa = current.logos > 0 ? current.value / current.logos : 0;
      const prevArpa = prev.logos > 0 ? prev.value / prev.logos : 0;

      return {
        stage: category,
        value: current.value,
        logos: current.logos,
        arpa,
        prevValue: prev.value || null,
        prevLogos: prev.logos || null,
        prevArpa: prevArpa || null,
        valueChange: valueChange || null,
        logosChange: logosChange || null,
        arpaChange: arpa - prevArpa || null,
        valueChangePct: prev.value > 0 ? (valueChange / prev.value) * 100 : null,
        dealsEntered: 0, // Would need movement data to calculate
        dealsExited: 0,
      };
    });

    // Calculate totals (MQL + SAL + SQL only - open pipeline)
    const funnelStages = stages.filter((s) =>
      FUNNEL_STAGES.includes(s.stage)
    );
    const totalValue = funnelStages.reduce((sum, s) => sum + s.value, 0);
    const totalLogos = funnelStages.reduce((sum, s) => sum + s.logos, 0);
    const arpa = totalLogos > 0 ? totalValue / totalLogos : 0;

    const prevTotalValue = funnelStages.reduce(
      (sum, s) => sum + (s.prevValue || 0),
      0
    );
    const prevTotalLogos = funnelStages.reduce(
      (sum, s) => sum + (s.prevLogos || 0),
      0
    );
    const prevArpa = prevTotalLogos > 0 ? prevTotalValue / prevTotalLogos : 0;

    // Calculate win rate
    const wonData = stageMap.get("WON")!;
    const prevWonData = prevStageMap.get("WON")!;
    const winRate = totalValue + wonData.value > 0
      ? (wonData.value / (totalValue + wonData.value)) * 100
      : 0;
    const prevWinRate = prevTotalValue + prevWonData.value > 0
      ? (prevWonData.value / (prevTotalValue + prevWonData.value)) * 100
      : 0;

    const metrics: DashboardMetrics = {
      weekId,
      weekStart: weekInfo.startDate.toISOString().split("T")[0],
      weekEnd: weekInfo.endDate.toISOString().split("T")[0],
      totalValue,
      totalLogos,
      arpa,
      winRate,
      prevTotalValue: prevTotalValue || null,
      prevTotalLogos: prevTotalLogos || null,
      prevArpa: prevArpa || null,
      prevWinRate: prevWinRate || null,
      stages,
    };

    res.json(metrics);
  } catch (error) {
    logger.error("Failed to get snapshot", { error });
    res.status(500).json({ error: "Failed to get snapshot" });
  }
});

/** POST /api/snapshots/trigger - Trigger a manual snapshot (async) */
router.post("/trigger", (_req: Request, res: Response) => {
  // Return immediately, run snapshot in background
  res.json({
    success: true,
    message: "Snapshot triggered — check /api/snapshots for progress",
  });

  schedulerService.triggerManualSnapshot().catch((error) => {
    logger.error("Background snapshot failed", { error });
  });
});

/** POST /api/snapshots/refresh-cache - Refresh HubSpot caches (owners, pipelines) */
router.post("/refresh-cache", async (_req: Request, res: Response) => {
  try {
    logger.info("Refreshing HubSpot caches...");
    await hubspotService.refreshCaches();

    // Get counts
    const ownersResult = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM hubspot_owners"
    );
    const pipelinesResult = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM hubspot_pipelines"
    );
    const stagesResult = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM hubspot_stages"
    );

    res.json({
      success: true,
      message: "Caches refreshed successfully",
      counts: {
        owners: parseInt(ownersResult.rows[0].count),
        pipelines: parseInt(pipelinesResult.rows[0].count),
        stages: parseInt(stagesResult.rows[0].count),
      },
    });
  } catch (error) {
    logger.error("Failed to refresh caches", { error });
    res.status(500).json({ error: "Failed to refresh caches" });
  }
});

export default router;
