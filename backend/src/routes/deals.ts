import { Router, type Request, type Response } from "express";
import { logger } from "../logger.js";
import { dealsService } from "../services/deals.js";

const router = Router();

/** GET /api/deals - Get current deals from HubSpot */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { weekId } = req.query;

    let deals;
    if (weekId && typeof weekId === "string") {
      // Get deals from snapshot
      deals = await dealsService.getDealsForWeek(weekId);
    } else {
      // Get live deals from HubSpot
      deals = await dealsService.getCurrentDeals();
    }

    res.json({
      deals: deals.map((deal) => ({
        id: deal.id,
        name: deal.name,
        customerName: deal.customerName,
        value: deal.value,
        arrLocal: deal.arrLocal,
        currency: deal.currency,
        stage: deal.stageCategory,
        stageId: deal.stageId,
        pipelineId: deal.pipelineId,
        pipelineName: deal.pipelineName,
        ownerId: deal.ownerId,
        ownerName: deal.ownerName,
        createdDate: deal.createdDate.toISOString(),
        closeDate: deal.closeDate?.toISOString() || null,
        lastModifiedDate: deal.lastModifiedDate.toISOString(),
        health: deal.health,
        healthReasons: deal.healthReasons,
        daysInStage: deal.daysInStage,
      })),
      total: deals.length,
    });
  } catch (error) {
    logger.error("Failed to get deals", { error });
    res.status(500).json({ error: "Failed to get deals" });
  }
});

/** GET /api/deals/:id - Get a specific deal */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { weekId } = req.query;

    let deals;
    if (weekId && typeof weekId === "string") {
      deals = await dealsService.getDealsForWeek(weekId);
    } else {
      deals = await dealsService.getCurrentDeals();
    }

    const deal = deals.find((d) => d.id === id);

    if (!deal) {
      res.status(404).json({ error: "Deal not found" });
      return;
    }

    res.json({
      id: deal.id,
      name: deal.name,
      customerName: deal.customerName,
      value: deal.value,
      arrLocal: deal.arrLocal,
      currency: deal.currency,
      stage: deal.stageCategory,
      stageName: deal.stageName,
      stageId: deal.stageId,
      pipelineId: deal.pipelineId,
      pipelineName: deal.pipelineName,
      ownerId: deal.ownerId,
      ownerName: deal.ownerName,
      createdDate: deal.createdDate.toISOString(),
      closeDate: deal.closeDate?.toISOString() || null,
      lastModifiedDate: deal.lastModifiedDate.toISOString(),
      health: deal.health,
      healthReasons: deal.healthReasons,
      daysInStage: deal.daysInStage,
      stageEnteredDate: deal.stageEnteredDate?.toISOString() || null,
    });
  } catch (error) {
    logger.error("Failed to get deal", { error });
    res.status(500).json({ error: "Failed to get deal" });
  }
});

export default router;
