import { Router, type Request, type Response } from "express";
import { query } from "../db/index.js";
import { logger } from "../logger.js";
import { FUNNEL_STAGES } from "../services/constants.js";
import type { TrendPoint } from "../types/index.js";

const router = Router();

/** GET /api/trends - Get historical trend data */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { weeks = "12" } = req.query;
    const numWeeks = Math.min(Math.max(parseInt(weeks as string, 10) || 12, 1), 52);

    // Get weekly totals for funnel stages
    const result = await query<{
      week_id: string;
      total_value: string;
      logo_count: number;
    }>(
      `SELECT
        week_id,
        SUM(total_value) as total_value,
        SUM(logo_count) as logo_count
       FROM weekly_stage_snapshots
       WHERE stage_category = ANY($1)
       GROUP BY week_id
       ORDER BY week_id DESC
       LIMIT $2`,
      [FUNNEL_STAGES, numWeeks]
    );

    const trends: TrendPoint[] = result.rows
      .map((row) => {
        const value = parseFloat(row.total_value) || 0;
        const logos = row.logo_count || 0;
        const weekMatch = row.week_id.match(/W(\d+)$/);

        return {
          weekId: row.week_id,
          week: weekMatch ? `W${parseInt(weekMatch[1], 10)}` : row.week_id,
          value,
          logos,
          arpa: logos > 0 ? Math.round(value / logos) : 0,
        };
      })
      .reverse();

    res.json({ trends });
  } catch (error) {
    logger.error("Failed to get trends", { error });
    res.status(500).json({ error: "Failed to get trends" });
  }
});

/** GET /api/trends/stage/:stage - Get trend data for a specific stage */
router.get("/stage/:stage", async (req: Request, res: Response) => {
  try {
    const stage = req.params.stage as string;
    const weeksParam = req.query.weeks;
    const weeksStr = typeof weeksParam === "string" ? weeksParam : "12";
    const numWeeks = Math.min(Math.max(parseInt(weeksStr, 10) || 12, 1), 52);
    const stageUpper = stage.toUpperCase();

    const result = await query<{
      week_id: string;
      total_value: string;
      logo_count: number;
      arpa: string;
    }>(
      `SELECT week_id, total_value, logo_count, arpa
       FROM weekly_stage_snapshots
       WHERE stage_category = $1
       ORDER BY week_id DESC
       LIMIT $2`,
      [stageUpper, numWeeks]
    );

    const trends: TrendPoint[] = result.rows
      .map((row) => {
        const weekMatch = row.week_id.match(/W(\d+)$/);
        return {
          weekId: row.week_id,
          week: weekMatch ? `W${parseInt(weekMatch[1], 10)}` : row.week_id,
          value: parseFloat(row.total_value) || 0,
          logos: row.logo_count || 0,
          arpa: parseFloat(row.arpa) || 0,
        };
      })
      .reverse();

    res.json({ trends, stage: stageUpper });
  } catch (error) {
    logger.error("Failed to get stage trends", { error });
    res.status(500).json({ error: "Failed to get stage trends" });
  }
});

export default router;
