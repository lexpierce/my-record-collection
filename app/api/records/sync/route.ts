/**
 * POST /api/records/sync
 *
 * Triggers a two-way sync between this app's database and the user's Discogs
 * collection. Progress is streamed as Server-Sent Events (SSE) so the browser
 * can update a progress bar in real time without polling.
 *
 * Each SSE event is a JSON-serialised SyncProgress object:
 *   { phase, pulled, pushed, skipped, errors, totalDiscogsItems }
 *
 * The final event always has phase === "done".
 */

import { executeSync } from "@/lib/discogs/sync";

// Disable Next.js response caching — sync must always run fresh
export const dynamic = "force-dynamic";
export async function POST() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const result = await executeSync((progress) => {
          send(progress);
        });
        send(result);
      } catch (err) {
        send({
          phase: "done",
          pulled: 0,
          pushed: 0,
          skipped: 0,
          errors: [err instanceof Error ? err.message : String(err)],
          totalDiscogsItems: 0,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
