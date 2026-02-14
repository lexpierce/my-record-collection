import { executeSync } from "@/lib/discogs/sync";

export const dynamic = "force-dynamic";

/**
 * POST /api/records/sync
 * Streams sync progress via SSE. Client reads the stream for real-time updates.
 */
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
