# Discogs integration endpoints

Endpoints that communicate with the Discogs API or drive the sync workflow.

## GET /api/records/search

Searches Discogs for releases matching a catalog number, artist+title, or UPC. Returns up to 10 results enriched with vinyl format metadata.

### Query parameters

Exactly one of the following search methods must be provided:

| Parameter | Type | Method | Example |
|---|---|---|---|
| `catalogNumber` | string | Catalog search | `SHVL 804` |
| `artist` + `title` | string + string | Artist/title search | `Pink Floyd` + `Dark Side` |
| `upc` | string | Barcode search | `724384260804` |

### Response (200 OK)

```json
{
  "results": [
    {
      "id": 3513358,
      "title": "Pink Floyd - The Dark Side Of The Moon",
      "year": "1973",
      "thumb": "https://i.discogs.com/...",
      "catno": "SHVL 804",
      "recordSize": "12\"",
      "vinylColor": "Black",
      "isShapedVinyl": false
    }
  ],
  "count": 1
}
```

### Error responses

- `400 Bad Request` — no valid search parameter combination supplied
- `500 Internal Server Error` — Discogs API failure

### Example

```bash
# Artist + title
curl "http://localhost:3000/api/records/search?artist=Pink+Floyd&title=Dark+Side"

# Catalog number
curl "http://localhost:3000/api/records/search?catalogNumber=SHVL+804"

# UPC
curl "http://localhost:3000/api/records/search?upc=724384260804"
```

### Notes

- Results are capped at the first 10 Discogs search hits.
- Each result triggers a `GET /releases/{id}` call to extract vinyl format details; this consumes extra rate-limit quota.
- If format-detail fetching fails for a result, the original result (without format fields) is returned instead.

---

## POST /api/records/fetch-from-discogs

Fetches a specific Discogs release by ID, saves it to the local database, and attempts to add it to the user's Discogs collection.

### Request body

| Field | Type | Required | Description |
|---|---|---|---|
| `releaseId` | integer | Yes | Discogs release ID |

### Response (201 Created)

```json
{
  "record": { ...savedRecord },
  "message": "Record fetched from Discogs and saved successfully"
}
```

### Error responses

- `400 Bad Request` — `releaseId` missing
- `500 Internal Server Error` — Discogs API failure or database error

### Example

```bash
curl -X POST http://localhost:3000/api/records/fetch-from-discogs \
  -H "Content-Type: application/json" \
  -d '{"releaseId": 3513358}'
```

### Notes

- Extracts vinyl-specific metadata (size, color, shaped status) from Discogs format descriptors.
- After saving, attempts to add the release to the user's Discogs collection via `addToCollection`. This step is best-effort — a failure does not fail the request.
- A `409` from `addToCollection` (already in collection) is treated as success; `isSyncedWithDiscogs` is set to `true`.
- If `DISCOGS_USERNAME` is not set, the collection-add step is skipped silently.
- Respects Discogs rate limits (60 req/min authenticated; token-bucket algorithm).

---

## POST /api/records/update-from-discogs

Refreshes an existing local record with the latest data from Discogs.

### Request body

| Field | Type | Required | Description |
|---|---|---|---|
| `recordId` | UUID string | Yes | Local database record ID |
| `discogsId` | string | Yes | Discogs release ID to fetch from |

### Response (200 OK)

```json
{
  "record": { ...updatedRecord },
  "message": "Record updated from Discogs successfully"
}
```

### Error responses

- `400 Bad Request` — `recordId` or `discogsId` missing
- `404 Not Found` — no local record with that `recordId`
- `500 Internal Server Error` — Discogs API failure or database error

### Example

```bash
curl -X POST http://localhost:3000/api/records/update-from-discogs \
  -H "Content-Type: application/json" \
  -d '{"recordId": "550e8400-e29b-41d4-a716-446655440000", "discogsId": "3513358"}'
```

### Notes

- Overwrites all Discogs-derived fields (artist, title, year, label, catalog number, images, genres, styles, vinyl metadata).
- Does not update `dataSource`, `isSyncedWithDiscogs`, or `createdAt`.
- Triggered by the "Update" button on the back of each `RecordCard`.

---

## POST /api/records/sync

Triggers a full two-way sync between the local database and the user's Discogs collection. Progress is streamed as Server-Sent Events (SSE).

### Request

No body required.

### Response — SSE stream (`text/event-stream`)

Each event is a JSON-serialised `SyncProgress` object:

```ts
interface SyncProgress {
  phase: "pull" | "push" | "done";
  pulled: number;      // releases imported from Discogs this run
  pushed: number;      // local records added to Discogs this run
  skipped: number;     // releases already in sync, skipped
  errors: string[];    // non-fatal error messages
  totalDiscogsItems: number; // total items in the Discogs collection
}
```

The stream ends when `phase === "done"`.

### Example (curl)

```bash
curl -N -X POST http://localhost:3000/api/records/sync
```

### Notes

- **Pull phase**: pages through `GET /users/{username}/collection/folders/0/releases` and inserts any release not already in the local DB (identified by `discogsId`).
- **Push phase**: finds local records with a `discogsId` but `isSyncedWithDiscogs = false`, then calls `addToCollection` for each.
- Idempotent — safe to run multiple times. Never deletes records from either side.
- Requires `DISCOGS_USERNAME` and `DISCOGS_TOKEN` environment variables.
- Respects Discogs rate limits (60 req/min authenticated, 25 req/min unauthenticated) with automatic 429 retry (max 3 attempts, honours `Retry-After` header).
- The route sets `export const dynamic = "force-dynamic"` to prevent Next.js from caching the response.

---

## Related

- [API overview](../README.md)
- [Discogs integration feature doc](../../features/discogs-integration.md)
- [Discogs client](../discogs-client.md)
- [Sync status endpoint](./sync-status.md)
