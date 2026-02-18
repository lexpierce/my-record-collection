# Discogs search and integration workflow

How the app communicates with the Discogs API to search for, fetch, and sync vinyl records.

## Overview

There are three distinct Discogs-driven workflows:

1. **Search** — find a release on Discogs by catalog number, artist+title, or UPC.
2. **Fetch** — save a specific Discogs release to the local database and add it to the user's Discogs collection.
3. **Sync** — two-way bulk sync between the local database and the user's full Discogs collection.

Each workflow is backed by a dedicated API route and uses the shared `DiscogsClient` from `lib/discogs/client.ts`.

## Search flow

**Entry point:** `SearchBar` component → `GET /api/records/search`

1. User enters a catalog number, artist+title, or UPC in the `SearchBar`.
2. The component calls `GET /api/records/search` with the appropriate query parameters.
3. The route creates a `DiscogsClient` and calls the matching search method:
   - `searchByCatalogNumber(catalogNumber)`
   - `searchByArtistAndTitle(artist, title)`
   - `searchByUPC(upc)`
4. Discogs returns up to 10 results. For each, the route calls `getRelease(id)` to fetch vinyl format details (`recordSize`, `vinylColor`, `isShapedVinyl`).
5. Enriched results are returned to the `SearchBar` for display.

If format-detail fetching fails for an individual result, the original result (without format fields) is returned rather than failing the whole search.

## Fetch flow

**Entry point:** `SearchBar` "Add" button → `POST /api/records/fetch-from-discogs`

1. User clicks "Add" on a search result.
2. `SearchBar` calls `POST /api/records/fetch-from-discogs` with `{ releaseId }`.
3. The route calls `getRelease(releaseId)` for full details.
4. The route extracts all record fields (artist, title, year, label, catalog number, images, genres, styles, vinyl metadata) and inserts a row into the `records` table.
5. If `DISCOGS_USERNAME` is set, the route calls `addToCollection(username, releaseId)` to add the release to the user's Discogs collection. This is best-effort:
   - Success: sets `isSyncedWithDiscogs = true`.
   - `409 Conflict` (already in collection): sets `isSyncedWithDiscogs = true`.
   - Any other error: logged; `isSyncedWithDiscogs` remains `false`.
6. The saved record is returned with a `201 Created` status.
7. `SearchBar` shows a success toast that auto-clears after 3 s.

## Sync flow

**Entry point:** Sync button on the home page → `POST /api/records/sync`

The sync is a **two-phase, idempotent** operation. Progress is streamed as SSE so the UI can show a live progress bar.

### Pull phase (Discogs → local DB)

1. Build a set of all `discogsId` values already in the local database.
2. Page through `GET /users/{username}/collection/folders/0/releases` (100 items per page).
3. For each release:
   - If its `discogsId` is already in the local set → skip (increment `skipped`).
   - Otherwise → insert a new row into `records` (increment `pulled`).
4. After all pages: mark every local record whose `discogsId` is in the live Discogs collection as `isSyncedWithDiscogs = true`.

### Push phase (local DB → Discogs)

1. Find all local records that have a `discogsId` but `isSyncedWithDiscogs = false`.
2. For each: call `addToCollection(username, discogsId)`.
   - Success or `409` → set `isSyncedWithDiscogs = true`, increment `pushed`.
   - Other error → log to `errors[]`, continue.
3. After all records: emit final `{ phase: "done" }` event and close the stream.

### SSE event shape

```ts
interface SyncProgress {
  phase: "pull" | "push" | "done";
  pulled: number;
  pushed: number;
  skipped: number;
  errors: string[];
  totalDiscogsItems: number;
}
```

Events are emitted after each page (pull) and after each record (push).

## Rate limiting

All Discogs API calls go through `DiscogsClient.makeRequest()`, which enforces:

- **Token bucket**: 60 tokens/min (authenticated), 25 tokens/min (unauthenticated). Each request consumes one token; if the bucket is empty the call waits.
- **429 retry**: up to 3 attempts with exponential backoff. If the response includes a `Retry-After` header, that value is used for the delay.

## Edge cases

### Duplicate detection

The `records` table has a UNIQUE constraint on `discogs_id`. The pull phase pre-checks the local set to avoid attempting duplicate inserts, but if a race condition causes a duplicate-key error the record is counted as `skipped` rather than `errors`.

### 429 from Discogs

`makeRequest()` retries automatically. If all 3 attempts fail, the error propagates and is recorded in `errors[]` (sync) or returned as a `500` (search/fetch routes).

### Missing `isSyncedWithDiscogs`

`isSyncedWithDiscogs` is a display flag only. The sync pull phase ignores it — it uses the _live Discogs collection contents_ as the source of truth, not the flag.

### Missing env vars

- `DISCOGS_USERNAME` missing: sync throws immediately; fetch-from-discogs skips the collection-add step silently.
- `DISCOGS_TOKEN` missing: requests are made unauthenticated (25 req/min limit); `GET /api/records/sync/status` shows an amber warning banner.

## Key files

| File | Purpose |
|---|---|
| `lib/discogs/client.ts` | `DiscogsClient` class — all Discogs API calls, rate limiter, format extractors |
| `lib/discogs/sync.ts` | `executeSync()` — orchestrates pull + push phases |
| `app/api/records/search/route.ts` | Search endpoint |
| `app/api/records/fetch-from-discogs/route.ts` | Fetch + save endpoint |
| `app/api/records/update-from-discogs/route.ts` | Refresh existing record |
| `app/api/records/sync/route.ts` | SSE sync endpoint |
| `app/api/records/sync/status/route.ts` | Checks env vars, drives warning banner |
| `components/records/SearchBar.tsx` | UI for search and fetch flows |

## Related

- [Discogs client API](../api/discogs-client.md)
- [Discogs integration endpoints](../api/endpoints/discogs-integration.md)
- [Vinyl metadata](./vinyl-metadata.md)
