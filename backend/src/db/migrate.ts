import fs from "fs";
import path from "path";
import { pool } from "./index.js";
import { logger } from "../logger.js";

async function migrate() {
  logger.info("Starting database migration...");

  try {
    // Use process.cwd() since this runs from the backend directory
    const schemaPath = path.join(process.cwd(), "src", "db", "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");

    await pool.query(schema);

    logger.info("Database migration completed successfully");
  } catch (error) {
    logger.error("Database migration failed", { error });
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
