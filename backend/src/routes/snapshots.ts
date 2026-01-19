import { Router, type Request, type Response } from "express";
import { query } from "../db/index.js";
import { logger } from "../logger.js";
import { schedulerService } from "../services/scheduler.js";
import { hubspotService } from "../services/hubspot.js";
import { parseWeekId, getCurrentWeek } from "../services/week.js";
import { ALL_STAGES, FUNNEL_STAGES } from "../services/constants.js";
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

    // Get stage snapshots
    const stageResult = await query<{
      stage_category: string;
      total_value: string;
      logo_count: number;
      arpa: string;
      prev_week_value: string | null;
      prev_week_logos: number | null;
      prev_week_arpa: string | null;
      value_change: string | null;
      logo_change: number | null;
      arpa_change: string | null;
      value_change_pct: string | null;
      deals_entered: number;
      deals_exited: number;
    }>(
      `SELECT stage_category, total_value, logo_count, arpa,
              prev_week_value, prev_week_logos, prev_week_arpa,
              value_change, logo_change, arpa_change, value_change_pct,
              deals_entered, deals_exited
       FROM weekly_stage_snapshots
       WHERE week_id = $1`,
      [weekId]
    );

    if (stageResult.rows.length === 0) {
      res.status(404).json({ error: "Snapshot not found" });
      return;
    }

    // Build stage metrics
    const stageMap = new Map<StageCategory, typeof stageResult.rows[0]>();
    for (const row of stageResult.rows) {
      stageMap.set(row.stage_category as StageCategory, row);
    }

    const stages: StageMetrics[] = ALL_STAGES.map((category) => {
      const row = stageMap.get(category);
      return {
        stage: category,
        value: row ? parseFloat(row.total_value) : 0,
        logos: row?.logo_count || 0,
        arpa: row ? parseFloat(row.arpa) : 0,
        prevValue: row?.prev_week_value
          ? parseFloat(row.prev_week_value)
          : null,
        prevLogos: row?.prev_week_logos ?? null,
        prevArpa: row?.prev_week_arpa ? parseFloat(row.prev_week_arpa) : null,
        valueChange: row?.value_change ? parseFloat(row.value_change) : null,
        logosChange: row?.logo_change ?? null,
        arpaChange: row?.arpa_change ? parseFloat(row.arpa_change) : null,
        valueChangePct: row?.value_change_pct
          ? parseFloat(row.value_change_pct)
          : null,
        dealsEntered: row?.deals_entered || 0,
        dealsExited: row?.deals_exited || 0,
      };
    });

    // Calculate totals (MQL + SAL + SQL only)
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
    const wonStage = stageMap.get("WON");
    const wonValue = wonStage ? parseFloat(wonStage.total_value) : 0;
    const winRate = totalValue > 0 ? (wonValue / (totalValue + wonValue)) * 100 : 0;

    const prevWonValue = wonStage?.prev_week_value
      ? parseFloat(wonStage.prev_week_value)
      : 0;
    const prevWinRate =
      prevTotalValue > 0
        ? (prevWonValue / (prevTotalValue + prevWonValue)) * 100
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

/** POST /api/snapshots/trigger - Trigger a manual snapshot */
router.post("/trigger", async (_req: Request, res: Response) => {
  try {
    const snapshotRunId = await schedulerService.triggerManualSnapshot();
    res.json({
      success: true,
      message: "Snapshot triggered successfully",
      snapshotRunId,
    });
  } catch (error) {
    logger.error("Failed to trigger snapshot", { error });
    res.status(500).json({ error: "Failed to trigger snapshot" });
  }
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
