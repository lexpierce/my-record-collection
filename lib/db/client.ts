import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Lazily-initialised Drizzle database instance.
 *
 * The client is created on first call to getDatabase() rather than at module
 * import time. This prevents "module threw at import time" errors during
 * `next build` in environments (CI/CD, edge preview) where DATABASE_URL is
 * not available at build time.
 *
 * Usage:
 * ```typescript
 * import { getDatabase } from "@/lib/db/client";
 * const db = getDatabase();
 * const allRecords = await db.select().from(schema.recordsTable);
 * ```
 */
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDatabase() {
  if (!_db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL environment variable is not defined. Please set it in your .env file."
      );
    }
    _db = drizzle(postgres(databaseUrl), { schema });
  }
  return _db;
}

/**
 * Export the schema for use in queries
 */
export { schema };
