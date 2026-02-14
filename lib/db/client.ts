import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Database connection URL from environment variables
 * Required for connecting to the Postgres database
 */
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL environment variable is not defined. Please set it in your .env file."
  );
}

/**
 * Postgres client connection
 * Creates a connection pool to the database
 */
const postgresClient = postgres(databaseUrl);

/**
 * Drizzle ORM database instance
 * Provides type-safe database access with the defined schema
 *
 * Usage:
 * ```typescript
 * import { database } from "@/lib/db/client";
 * const allRecords = await database.select().from(schema.recordsTable);
 * ```
 */
export const database = drizzle(postgresClient, { schema });

/**
 * Export the schema for use in queries
 */
export { schema };
