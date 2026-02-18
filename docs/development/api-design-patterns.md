# API design patterns

Conventions used across all API routes in this project.

## File locations

Every route lives at `app/api/<resource>/route.ts` (Next.js App Router convention). Dynamic segments use directory names like `[id]`.

```
app/api/
├── am_i_evil/route.ts                # health check
├── records/
│   ├── route.ts                      # GET /api/records, POST /api/records
│   ├── [id]/route.ts                 # GET/PUT/DELETE /api/records/[id]
│   ├── search/route.ts               # GET /api/records/search
│   ├── fetch-from-discogs/route.ts   # POST /api/records/fetch-from-discogs
│   ├── update-from-discogs/route.ts  # POST /api/records/update-from-discogs
│   ├── sync/route.ts                 # POST /api/records/sync (SSE)
│   └── sync/status/route.ts          # GET /api/records/sync/status
```

## Response shape

### Success

```json
{
  "record": { ... }
}
```

or for collections:

```json
{
  "records": [ ... ],
  "count": 42
}
```

or for mutations with a message:

```json
{
  "record": { ... },
  "message": "Record updated successfully"
}
```

### Error

```json
{
  "error": "Short error type",
  "message": "Detailed human-readable explanation"
}
```

Always return `{ "error": "..." }` — never return a bare string or empty body.

## HTTP status codes

| Situation | Code |
|---|---|
| Read succeeded | `200 OK` |
| Resource created | `201 Created` |
| Validation failure (missing/invalid params) | `400 Bad Request` |
| Resource not found | `404 Not Found` |
| Unhandled exception | `500 Internal Server Error` |

No `204 No Content` — even DELETE returns a JSON `{ "message": "..." }` body.

## Handler signatures

Routes use the Next.js App Router handler signature. Dynamic segment params are a `Promise` and must be awaited:

```ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const recordId = (await params).id;
  // ...
}
```

Static routes (no dynamic segment) only receive `request`:

```ts
export async function POST(request: NextRequest) { ... }
```

## Query parameter parsing

Use `request.nextUrl.searchParams` (not `new URL(request.url)`). This preserves Next.js internal URL handling.

```ts
const { searchParams } = request.nextUrl;
const sortBy = searchParams.get("sortBy") ?? "createdAt";
const sizeValues = searchParams.getAll("size"); // repeated params → array
```

Always validate and fall back to safe defaults; never pass raw query strings to the database.

## Database access

Use the lazy getter `getDatabase()` from `@/lib/db/client`. Never import the client at module scope — this would throw at import time if `DATABASE_URL` is unset (e.g., during tests or build).

```ts
// Good
const records = await getDatabase().select().from(schema.recordsTable);

// Bad — throws at import if DATABASE_URL is missing
import { db } from "@/lib/db/client";
```

## External API calls (Discogs)

Create the client with `createDiscogsClient()` from `@/lib/discogs/client`. One client instance per request handler is sufficient — it contains the rate-limiter state for that request lifecycle.

Never create a new client inside a loop or helper function that is called per-item (see `lib/discogs/sync.ts` for the correct pattern: pass the shared client as a parameter).

## Error handling

All handlers wrap their body in `try/catch` and return a `500` on unexpected errors:

```ts
try {
  // ...
} catch (error) {
  console.error("Context message:", error);
  return NextResponse.json(
    {
      error: "Failed to <action>",
      message: error instanceof Error ? error.message : "Unknown error",
    },
    { status: 500 }
  );
}
```

Log the error with `console.error` so it appears in server logs. Do not swallow errors silently.

## SSE (Server-Sent Events)

The sync route streams progress as SSE. Use `ReadableStream` with a `TextEncoder` and return a `Response` (not `NextResponse`) with `Content-Type: text/event-stream`.

```ts
export const dynamic = "force-dynamic"; // disable Next.js response caching

export async function POST() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      // ... stream events ...
      controller.close();
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
```

## Caching

By default, Next.js may cache GET route responses. For routes that must always run fresh (e.g., sync status), add:

```ts
export const dynamic = "force-dynamic";
```

## Related

- [Development overview](./README.md)
- [Endpoint documentation](../api/README.md)
- [Testing strategy](../testing.md)
