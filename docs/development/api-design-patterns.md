# API design patterns

Conventions for all `app/api/*/route.ts` handlers.

## Route file layout

```text
app/api/
├── am_i_evil/route.ts                # GET health check
├── records/
│   ├── route.ts                      # GET (list) + POST (create)
│   ├── [id]/route.ts                 # GET / PUT / DELETE single record
│   ├── search/route.ts               # GET search Discogs
│   ├── fetch-from-discogs/route.ts   # POST save Discogs release
│   ├── update-from-discogs/route.ts  # POST refresh from Discogs
│   ├── sync/route.ts                 # POST SSE sync stream
│   └── sync/status/route.ts          # GET env var check
```

## Response shape

Success: `{ "record": { ... } }` or `{ "records": [...], "count": N }`

Error: `{ "error": "Short type", "message": "Detail" }`

Always JSON body, never bare string or empty.

## Status codes

| Code | When |
|------|------|
| 200 | Read or update succeeded |
| 201 | Resource created |
| 400 | Missing/invalid params |
| 404 | Resource not found |
| 500 | Unhandled exception |

No `204` — even DELETE returns JSON.

## Handler signatures

Dynamic segments are `Promise`, must be awaited:

```ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const recordId = (await params).id;
}
```

## Query params

Use `request.nextUrl.searchParams`. Validate + default.

```ts
const sortBy = searchParams.get("sortBy") ?? "createdAt";
const sizeValues = searchParams.getAll("size");
```

## Database access

Use `getDatabase()` from `@/lib/db/client`. Never import at module scope.

## Discogs client

Use `createDiscogsClient()`. One instance per handler. Never create inside loops — pass as parameter.

## Error handling

```ts
try {
  // ...
} catch (error) {
  console.error("Context:", error);
  return NextResponse.json({
    error: "Failed to <action>",
    message: error instanceof Error ? error.message : "Unknown error",
  }, { status: 500 });
}
```

## SSE (sync route)

`ReadableStream` + `TextEncoder`, return `Response` (not `NextResponse`).
Set `export const dynamic = "force-dynamic"`.

```ts
headers: {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
}
```

## Related

- [Endpoint reference](../api/README.md)
- [Testing](../testing.md)
