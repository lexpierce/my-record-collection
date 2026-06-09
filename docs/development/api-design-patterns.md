# API design patterns

Conventions for all Astro endpoint handlers under `src/pages/api/` (and the `/am_i_evil` page).

## Route file layout

```text
src/pages/
├── am_i_evil.astro                   # GET health check page
└── api/
    ├── records.ts                    # GET (list)
    └── records/
        ├── [id].ts                   # GET / DELETE single record
        ├── image.ts                  # GET resize/convert artwork
        ├── update-from-discogs.ts    # POST refresh one cached record
        ├── sync.ts                   # POST SSE pull-only sync stream
        └── sync/status.ts            # GET env var check
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
  request: Request,
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
  return jsonResponse({
    error: "Failed to <action>",
    message: error instanceof Error ? error.message : "Unknown error",
  }, { status: 500 });
}
```

## SSE (sync route)

`ReadableStream` + `TextEncoder`, return standard `Response`.
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
