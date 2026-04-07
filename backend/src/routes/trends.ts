import { Router, type Request, type Response } from "express";
import { query } from "../db/index.js";
import { logger } from "../logger.js";
import { FUNNEL_STAGES, SALES_PIPELINE_IDS } from "../services/constants.js";
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

/** GET /api/trends/by-stage - Get trend data broken down by stage */
router.get("/by-stage", async (req: Request, res: Response) => {
  try {
    const { weeks = "12" } = req.query;
    const numWeeks = Math.min(Math.max(parseInt(weeks as string, 10) || 12, 1), 52);

    // Get weekly values per stage (only active pipeline stages)
    // Filter by sales pipeline IDs to match the Pipeline section
    const activeStages = ["SAL", "SQL", "QUOTE_SENT", "NEGOTIATION"];

    const result = await query<{
      week_id: string;
      stage_category: string;
      total_value: string;
      logo_count: string;
    }>(
      `SELECT
        week_id,
        stage_category,
        SUM(arr_usd) as total_value,
        COUNT(*) as logo_count
       FROM deal_weekly_snapshots
       WHERE stage_category = ANY($1)
         AND pipeline_id = ANY($2)
       GROUP BY week_id, stage_category
       ORDER BY week_id DESC`,
      [activeStages, SALES_PIPELINE_IDS]
    );

    // Group by week and pivot stages into columns
    const weekMap = new Map<string, {
      weekId: string;
      week: string;
      SAL: number;
      SQL: number;
      QUOTE_SENT: number;
      NEGOTIATION: number;
      total: number;
    }>();

    for (const row of result.rows) {
      const weekMatch = row.week_id.match(/W(\d+)$/);
      const weekLabel = weekMatch ? `W${parseInt(weekMatch[1], 10)}` : row.week_id;

      if (!weekMap.has(row.week_id)) {
        weekMap.set(row.week_id, {
          weekId: row.week_id,
          week: weekLabel,
          SAL: 0,
          SQL: 0,
          QUOTE_SENT: 0,
          NEGOTIATION: 0,
          total: 0,
        });
      }

      const weekData = weekMap.get(row.week_id)!;
      const value = parseFloat(row.total_value) || 0;

      if (row.stage_category === "SAL") weekData.SAL = value;
      else if (row.stage_category === "SQL") weekData.SQL = value;
      else if (row.stage_category === "QUOTE_SENT") weekData.QUOTE_SENT = value;
      else if (row.stage_category === "NEGOTIATION") weekData.NEGOTIATION = value;

      weekData.total = weekData.SAL + weekData.SQL + weekData.QUOTE_SENT + weekData.NEGOTIATION;
    }

    // Convert to array, sort by week, and limit
    const trends = Array.from(weekMap.values())
      .sort((a, b) => a.weekId.localeCompare(b.weekId))
      .slice(-numWeeks);

    res.json({ trends });
  } catch (error) {
    logger.error("Failed to get trends by stage", { error });
    res.status(500).json({ error: "Failed to get trends by stage" });
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
