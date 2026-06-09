# Discogs integration endpoints

This app is **read-only** toward Discogs. It never writes to the Discogs
collection. There is no search or add flow — records enter the local database
only via sync, which mirrors the user's Discogs collection for speed and
caching.

## POST /api/records/update-from-discogs

Body: `{ "recordId": UUID, "discogsId": string }`

Refreshes a single cached record by re-reading the release from Discogs
(`getRelease`). Overwrites all Discogs-derived fields. Does not change
`dataSource`, `isSyncedWithDiscogs`, `createdAt`. Read-only toward Discogs.

Response: `{ "record": {...}, "message": "..." }` (200)

Errors: 400, 404, 500

Source: `src/pages/api/records/update-from-discogs.ts`

## POST /api/records/sync

SSE stream. Endpoint does not read a body.

Browser callers must still send `Content-Type: application/json` and a JSON body (`{}`) so Astro SSR does not classify the request as a form-like POST before route dispatch.

### Pull phase (Discogs → local cache)

Pages through `GET /users/{username}/collection/folders/0/releases`.

- New `discogsId` → inserts a new cached record (`pulled`).
- Existing `discogsId` → refreshes the cached record's metadata (`updated`).

There is no push phase: sync never writes to Discogs and never deletes local
records.

### SSE event

```ts
interface SyncProgress {
  phase: "pull" | "done";
  pulled: number; updated: number; skipped: number;
  errors: string[]; totalDiscogsItems: number;
}
```

Stream ends when `phase === "done"`.

Idempotent. Never writes to Discogs, never deletes. Requires `DISCOGS_USERNAME` + `DISCOGS_TOKEN`.

429 retry: max 3 attempts, honours `Retry-After`.

Source: `src/pages/api/records/sync.ts`, `lib/discogs/sync.ts`
