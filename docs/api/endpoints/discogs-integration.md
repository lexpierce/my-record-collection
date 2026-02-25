# Discogs integration endpoints

## GET /api/records/search

Searches Discogs. Exactly one method required:

| Params | Method |
|--------|--------|
| `catalogNumber` | Catalog search |
| `artist` + `title` | Artist/title search |
| `upc` | Barcode search |

Returns up to 10 results, each enriched via `getRelease()` with `recordSize`, `vinylColor`, `isShapedVinyl`. Failed enrichment returns the result without format fields.

Response: `{ "results": [...], "count": N }` (200)

Errors: 400 (no valid params), 500

Source: `app/api/records/search/route.ts`

## POST /api/records/fetch-from-discogs

Body: `{ "releaseId": number }`

1. Calls `getRelease(releaseId)` for full details
2. Extracts vinyl metadata, inserts into `records` table
3. If `DISCOGS_USERNAME` set: calls `addToCollection()` (best-effort)
   - Success or 409 → `isSyncedWithDiscogs = true`
   - Other error → logged, flag stays `false`

Response: `{ "record": {...}, "message": "..." }` (201)

Errors: 400, 500

Source: `app/api/records/fetch-from-discogs/route.ts`

## POST /api/records/update-from-discogs

Body: `{ "recordId": UUID, "discogsId": string }`

Overwrites all Discogs-derived fields. Does not change `dataSource`, `isSyncedWithDiscogs`, `createdAt`.

Response: `{ "record": {...}, "message": "..." }` (200)

Errors: 400, 404, 500

Source: `app/api/records/update-from-discogs/route.ts`

## POST /api/records/sync

SSE stream. No body required.

### Pull phase (Discogs → local)

Pages through `GET /users/{username}/collection/folders/0/releases`. Skips existing `discogsId`. Inserts new records.

### Push phase (local → Discogs)

Finds records with `discogsId` but `isSyncedWithDiscogs = false`. Calls `addToCollection()` for each.

### SSE event

```ts
interface SyncProgress {
  phase: "pull" | "push" | "done";
  pulled: number; pushed: number; skipped: number;
  errors: string[]; totalDiscogsItems: number;
}
```

Stream ends when `phase === "done"`.

Idempotent. Never deletes. Requires `DISCOGS_USERNAME` + `DISCOGS_TOKEN`.

429 retry: max 3 attempts, honours `Retry-After`.

`export const dynamic = "force-dynamic"`.

Source: `app/api/records/sync/route.ts`, `lib/discogs/sync.ts`
