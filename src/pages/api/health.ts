import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/db/client";
import { jsonResponse } from "./_helpers";

/**
 * Readiness probe: verifies the app can reach Postgres.
 *
 * Returns 200 `{ status: "ok" }` when a trivial query succeeds, otherwise
 * 503 `{ status: "degraded" }`. Used as the Render health check so the service
 * is only marked healthy when its database dependency is reachable.
 */
export async function GET(): Promise<Response> {
  try {
    await getDatabase().execute(sql`select 1`);
    return jsonResponse({ status: "ok" });
  } catch (error) {
    console.error("Health check failed:", error);
    return jsonResponse({ status: "degraded" }, 503);
  }
}
