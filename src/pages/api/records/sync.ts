import { executeSync } from "@/lib/discogs/sync";

export async function POST(): Promise<Response> {
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
      } catch (error) {
        send({
          phase: "done",
          pulled: 0,
          updated: 0,
          skipped: 0,
          errors: [error instanceof Error ? error.message : String(error)],
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
