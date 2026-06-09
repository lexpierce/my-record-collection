import { jsonResponse } from "../../_helpers";
import { missingSyncEnv } from "@/lib/env";

export async function GET(): Promise<Response> {
  const missing = missingSyncEnv();

  return jsonResponse({
    ready: missing.length === 0,
    missing,
  });
}
