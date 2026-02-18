# Error Handling

How errors are caught, propagated, and surfaced to users in this application.

## API Routes

All API route handlers use a top-level `try/catch`. Errors are returned as JSON with a consistent shape:

```json
{
  "error": "Short human-readable error type",
  "message": "Detailed error message (from Error.message or 'Unknown error')"
}
```

### Status Codes

| Code | Meaning | Used when |
|---|---|---|
| 200 | OK | Successful read or update |
| 201 | Created | Successful insert |
| 400 | Bad Request | Missing required fields, invalid input |
| 404 | Not Found | Record UUID not found in database |
| 500 | Internal Server Error | Unexpected DB error, network failure |

### Example

```ts
export async function POST(request: NextRequest) {
  try {
    const { artistName } = await request.json();
    if (!artistName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const result = await database.insert(...).returning();
    return NextResponse.json({ record: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Error adding record:", error);
    return NextResponse.json({
      error: "Failed to add record",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
```

## Discogs Client Errors

`DiscogsClient.makeRequest()` throws a typed error when the Discogs API returns a non-2xx status:

```ts
const err = new Error(`Discogs API error: ${status} ${statusText}`) as Error & { status: number };
err.status = response.status;
throw err;
```

Callers check `err.status` to distinguish handled cases:

```ts
try {
  await client.addToCollection(username, releaseId);
} catch (err) {
  const e = err as Error & { status?: number };
  if (e.status === 409) {
    // Already in collection — not an error
  } else {
    // Actual failure
    progress.errors.push(`Push ${releaseId}: ${e.message}`);
  }
}
```

## Sync Errors

`executeSync()` collects non-fatal errors in a `progress.errors` string array rather than throwing. This lets the sync run to completion even if individual records fail. Fatal errors (e.g. missing `DISCOGS_USERNAME`) are thrown immediately.

The SSE route (`POST /api/records/sync`) catches thrown errors and streams them as a final `{ phase: "done", errors: [...] }` event — the client always receives a terminal event.

## Database Errors

`lib/db/client.ts` throws at **import time** if `DATABASE_URL` is not set. This fails fast at startup rather than returning confusing 500 errors at runtime.

Unique constraint violations (`error.message.includes("unique")`) in sync are treated as skips, not errors. This prevents duplicate Discogs releases from counting as failures.

## Component Error Handling

React components display inline error messages (not thrown boundaries) for fetch failures. They follow this pattern:

```ts
try {
  const res = await fetch("/api/records");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  setRecords(data.records);
} catch (error) {
  setErrorMessage(error instanceof Error ? error.message : "Unknown error");
}
```

**No `window.alert()` for fetch errors** — alerts block the UI thread and are untestable. Use state instead.

> **Note:** `RecordCard` still uses `window.alert()` for update/delete results. This is a known issue — see [TODO.md](./TODO.md).

## Rate Limiting

The `RateLimiter` class in `lib/discogs/client.ts` adds delays between requests rather than throwing errors. If the Discogs API responds with a non-OK status (including 429 Too Many Requests), the `makeRequest` method throws with `.status = 429`, which propagates to the calling route as a 500.

## Logging

All errors are logged to `console.error` in API routes before returning the 500 response. In production on Render, these logs are visible in the service dashboard under "Logs".

Client-side console.error calls are present for debugging but should not be relied on in production.

## Related

- [API Documentation](./api/README.md)
- [Discogs Client](./api/discogs-client.md)
- [Testing](./testing.md) — how error paths are tested
