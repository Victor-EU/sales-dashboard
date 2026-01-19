import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { checkConnection } from "./db/index.js";
import { schedulerService } from "./services/scheduler.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

// Routes
import snapshotsRouter from "./routes/snapshots.js";
import dealsRouter from "./routes/deals.js";
import trendsRouter from "./routes/trends.js";
import movementsRouter from "./routes/movements.js";
import scopedMetricsRouter from "./routes/scoped-metrics.js";

const app = express();

// Middleware
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip,
  });
  next();
});

// Health check
app.get("/health", async (_req, res) => {
  const dbHealthy = await checkConnection();
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    database: dbHealthy ? "connected" : "disconnected",
  });
});

// API routes
app.use("/api/snapshots", snapshotsRouter);
app.use("/api/deals", dealsRouter);
app.use("/api/trends", trendsRouter);
app.use("/api/movements", movementsRouter);
app.use("/api/scoped-metrics", scopedMetricsRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function start() {
  try {
    // Check database connection
    const dbConnected = await checkConnection();
    if (!dbConnected) {
      logger.warn("Database not connected - some features may not work");
    }

    // Start scheduler
    schedulerService.start();

    // Start HTTP server
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`CORS origin: ${config.cors.origin}`);
      logger.info(`Snapshot schedule: ${config.snapshot.cron}`);
    });
  } catch (error) {
    logger.error("Failed to start server", { error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down...");
  schedulerService.stop();
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down...");
  schedulerService.stop();
  process.exit(0);
});

start();
