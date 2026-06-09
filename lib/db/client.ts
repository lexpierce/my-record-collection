import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl } from "@/lib/env";
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

/**
 * Maximum connections per process. Kept small so a single web instance cannot
 * exhaust the managed Postgres connection ceiling (the starter/basic plans
 * allow only a handful). Override with DB_POOL_MAX if you scale up.
 */
function poolMax(): number {
  const parsed = Number.parseInt(process.env.DB_POOL_MAX ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 5;
}

export function getDatabase() {
  if (!_db) {
    _db = drizzle(postgres(getDatabaseUrl(), { max: poolMax() }), { schema });
  }
  return _db;
}

/**
 * Export the schema for use in queries
 */
export { schema };
