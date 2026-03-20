import type { Config } from "drizzle-kit";

/**
 * Drizzle Kit configuration for database migrations
 * Configures the connection to Postgres 18 and schema location
 */
export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
  verbose: true,
  strict: true,
} satisfies Config;
