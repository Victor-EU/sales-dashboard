import { config as dotenvConfig } from "dotenv";
import { z } from "zod";

dotenvConfig();

const envSchema = z.object({
  PORT: z.string().default("3001"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.string().default("5432"),
  DB_NAME: z.string().default("sales_dashboard"),
  DB_USER: z.string().default("postgres"),
  DB_PASSWORD: z.string().default(""),

  HUBSPOT_ACCESS_TOKEN: z.string().min(1, "HubSpot access token is required"),
  HUBSPOT_PORTAL_ID: z.string().optional(),

  SNAPSHOT_CRON: z.string().default("0 18 * * 5"),
  SNAPSHOT_TIMEZONE: z.string().default("UTC"),

  FRONTEND_URL: z.string().default("http://localhost:3000"),
});

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid environment configuration:");
    console.error(parsed.error.format());
    process.exit(1);
  }

  const env = parsed.data;

  return {
    port: parseInt(env.PORT, 10),
    nodeEnv: env.NODE_ENV,
    isDev: env.NODE_ENV === "development",
    isProd: env.NODE_ENV === "production",

    database: {
      connectionString:
        env.DATABASE_URL ||
        `postgresql://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`,
      host: env.DB_HOST,
      port: parseInt(env.DB_PORT, 10),
      name: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
    },

    hubspot: {
      accessToken: env.HUBSPOT_ACCESS_TOKEN,
      portalId: env.HUBSPOT_PORTAL_ID,
    },

    snapshot: {
      cron: env.SNAPSHOT_CRON,
      timezone: env.SNAPSHOT_TIMEZONE,
    },

    cors: {
      origin: env.FRONTEND_URL,
    },
  };
}

export const config = loadConfig();
export type Config = typeof config;
