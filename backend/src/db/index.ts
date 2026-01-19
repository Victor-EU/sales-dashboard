import pg from "pg";
import { config } from "../config.js";
import { logger } from "../logger.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.database.connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("connect", () => {
  logger.debug("Database connection established");
});

pool.on("error", (err) => {
  logger.error("Unexpected database error", { error: err.message });
});

/** Execute a single query */
export async function query<T extends pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug("Query executed", {
      text: text.substring(0, 100),
      duration,
      rows: result.rowCount,
    });
    return result;
  } catch (error) {
    logger.error("Query failed", { text: text.substring(0, 100), error });
    throw error;
  }
}

/** Get a client for transactions */
export async function getClient(): Promise<pg.PoolClient> {
  const client = await pool.connect();
  return client;
}

/** Check database connection */
export async function checkConnection(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    logger.info("Database connection verified");
    return true;
  } catch (error) {
    logger.error("Database connection failed", { error });
    return false;
  }
}

/** Close the pool */
export async function closePool(): Promise<void> {
  await pool.end();
  logger.info("Database pool closed");
}
