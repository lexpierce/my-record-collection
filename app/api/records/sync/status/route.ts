import { NextResponse } from "next/server";

/**
 * GET /api/records/sync/status
 *
 * Returns the sync readiness status — which env vars required for sync are
 * present. Called by the client on mount so a warning can be shown before
 * the user attempts to sync with a missing configuration.
 *
 * Response:
 *   { ready: boolean, missing: string[] }
 */
export async function GET() {
  const missing: string[] = [];

  if (!process.env.DISCOGS_USERNAME) missing.push("DISCOGS_USERNAME");
  if (!process.env.DISCOGS_TOKEN) missing.push("DISCOGS_TOKEN");

  return NextResponse.json({
    ready: missing.length === 0,
    missing,
  });
}
