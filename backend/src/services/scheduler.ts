import cron from "node-cron";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { snapshotService } from "./snapshot.js";

class SchedulerService {
  private snapshotTask: cron.ScheduledTask | null = null;

  /** Start the scheduler */
  start(): void {
    logger.info(`Starting scheduler with cron: ${config.snapshot.cron}`);

    // Validate cron expression
    if (!cron.validate(config.snapshot.cron)) {
      logger.error(`Invalid cron expression: ${config.snapshot.cron}`);
      return;
    }

    // Schedule weekly snapshot (default: Friday 18:00 UTC)
    this.snapshotTask = cron.schedule(
      config.snapshot.cron,
      async () => {
        logger.info("Scheduled snapshot job triggered");
        try {
          await snapshotService.createSnapshot();
          logger.info("Scheduled snapshot completed successfully");
        } catch (error) {
          logger.error("Scheduled snapshot failed", { error });
        }
      },
      {
        timezone: config.snapshot.timezone,
      }
    );

    logger.info("Scheduler started successfully");
  }

  /** Stop the scheduler */
  stop(): void {
    if (this.snapshotTask) {
      this.snapshotTask.stop();
      this.snapshotTask = null;
      logger.info("Scheduler stopped");
    }
  }

  /** Trigger a manual snapshot */
  async triggerManualSnapshot(): Promise<number> {
    logger.info("Manual snapshot triggered");
    return snapshotService.createSnapshot();
  }
}

export const schedulerService = new SchedulerService();
export default schedulerService;
