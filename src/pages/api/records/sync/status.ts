import { jsonResponse } from "../../_helpers";

export async function GET(): Promise<Response> {
  const missing: string[] = [];

  if (!process.env.DISCOGS_USERNAME) missing.push("DISCOGS_USERNAME");
  if (!process.env.DISCOGS_TOKEN) missing.push("DISCOGS_TOKEN");

  return jsonResponse({
    ready: missing.length === 0,
    missing,
  });
}
