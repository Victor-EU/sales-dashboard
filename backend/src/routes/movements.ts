import { Router, type Request, type Response } from "express";
import { query } from "../db/index.js";
import { logger } from "../logger.js";
import { getCurrentWeek } from "../services/week.js";
import type { MovementResponse, MovementType } from "../types/index.js";

const router = Router();

/** GET /api/movements - Get deal movements for a week */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { weekId } = req.query;
    const targetWeekId = (weekId as string) || getCurrentWeek().weekId;

    const result = await query<{
      id: number;
      deal_id: string;
      deal_name: string;
      end_customer_name: string | null;
      from_stage_category: string | null;
      to_stage_category: string;
      movement_type: string;
      deal_value: string;
      owner_name: string | null;
      week_id: string;
    }>(
      `SELECT id, deal_id, deal_name, end_customer_name,
              from_stage_category, to_stage_category, movement_type,
              deal_value, owner_name, week_id
       FROM deal_stage_movements
       WHERE week_id = $1
       ORDER BY deal_value DESC`,
      [targetWeekId]
    );

    const movements: MovementResponse[] = result.rows.map((row) => ({
      id: row.id.toString(),
      dealId: row.deal_id,
      dealName: row.deal_name || "Unknown Deal",
      customerName: row.end_customer_name,
      fromStage: row.from_stage_category as MovementResponse["fromStage"],
      toStage: row.to_stage_category as MovementResponse["toStage"],
      movementType: row.movement_type as MovementType,
      value: parseFloat(row.deal_value) || 0,
      ownerName: row.owner_name,
      weekId: row.week_id,
    }));

    // Group by movement type
    const grouped = {
      forward: movements.filter(
        (m) => m.movementType === "FORWARD" || m.movementType === "SKIP_FORWARD"
      ),
      won: movements.filter((m) => m.movementType === "WON"),
      lost: movements.filter((m) => m.movementType === "LOST"),
      newDeals: movements.filter((m) => m.movementType === "NEW_DEAL"),
      backward: movements.filter((m) => m.movementType === "BACKWARD"),
      resurrected: movements.filter((m) => m.movementType === "RESURRECTED"),
    };

    // Calculate totals
    const totals = {
      forward: grouped.forward.reduce((sum, m) => sum + m.value, 0),
      won: grouped.won.reduce((sum, m) => sum + m.value, 0),
      lost: grouped.lost.reduce((sum, m) => sum + m.value, 0),
      newDeals: grouped.newDeals.reduce((sum, m) => sum + m.value, 0),
    };

    res.json({
      weekId: targetWeekId,
      movements: grouped,
      totals,
      counts: {
        forward: grouped.forward.length,
        won: grouped.won.length,
        lost: grouped.lost.length,
        newDeals: grouped.newDeals.length,
        backward: grouped.backward.length,
        resurrected: grouped.resurrected.length,
        total: movements.length,
      },
    });
  } catch (error) {
    logger.error("Failed to get movements", { error });
    res.status(500).json({ error: "Failed to get movements" });
  }
});

/** GET /api/movements/summary - Get movement summary across weeks */
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const { weeks = "12" } = req.query;
    const numWeeks = Math.min(Math.max(parseInt(weeks as string, 10) || 12, 1), 52);

    const result = await query<{
      week_id: string;
      movement_type: string;
      count: string;
      total_value: string;
    }>(
      `SELECT week_id, movement_type, COUNT(*) as count, SUM(deal_value) as total_value
       FROM deal_stage_movements
       WHERE week_id IN (
         SELECT DISTINCT week_id
         FROM deal_stage_movements
         ORDER BY week_id DESC
         LIMIT $1
       )
       GROUP BY week_id, movement_type
       ORDER BY week_id DESC, movement_type`,
      [numWeeks]
    );

    // Group by week
    const byWeek = new Map<
      string,
      { type: string; count: number; value: number }[]
    >();

    for (const row of result.rows) {
      const weekData = byWeek.get(row.week_id) || [];
      weekData.push({
        type: row.movement_type,
        count: parseInt(row.count, 10),
        value: parseFloat(row.total_value) || 0,
      });
      byWeek.set(row.week_id, weekData);
    }

    const summary = Array.from(byWeek.entries()).map(([weekId, data]) => ({
      weekId,
      forward:
        data.filter((d) => d.type === "FORWARD" || d.type === "SKIP_FORWARD")
          .reduce((sum, d) => sum + d.count, 0),
      won: data.find((d) => d.type === "WON")?.count || 0,
      lost: data.find((d) => d.type === "LOST")?.count || 0,
      newDeals: data.find((d) => d.type === "NEW_DEAL")?.count || 0,
      totalValue: data.reduce((sum, d) => sum + d.value, 0),
    }));

    res.json({ summary });
  } catch (error) {
    logger.error("Failed to get movement summary", { error });
    res.status(500).json({ error: "Failed to get movement summary" });
  }
});

export default router;
