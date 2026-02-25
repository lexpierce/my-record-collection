# Discogs integration workflows

Three workflows, all using `DiscogsClient` from `lib/discogs/client.ts`.

## Search

`SearchBar` → `GET /api/records/search` → Discogs search → `getRelease()` per result (max 10) → enriched results returned.

Failed enrichment per-result: original result returned without format fields.

## Fetch

`SearchBar` "+ Add" → `POST /api/records/fetch-from-discogs` → `getRelease()` → extract metadata → insert `records` row → attempt `addToCollection()` (best-effort, 409 = already synced).

## Sync

`POST /api/records/sync` → SSE stream.

### Pull (Discogs → local)

1. Build set of existing `discogsId` values
2. Page through `GET /users/{username}/collection/folders/0/releases`
3. Skip existing, insert new
4. Mark all matched records `isSyncedWithDiscogs = true`

### Push (local → Discogs)

1. Find records with `discogsId` + `isSyncedWithDiscogs = false`
2. Call `addToCollection()` for each
3. Emit `{ phase: "done" }`

Idempotent. Never deletes. Requires `DISCOGS_USERNAME` + `DISCOGS_TOKEN`.

## Edge cases

- Duplicate `discogs_id` insert → counted as `skipped`
- 429 → auto-retry (3 attempts, `Retry-After`)
- `isSyncedWithDiscogs` is display-only; sync uses live Discogs contents as truth
- Missing `DISCOGS_USERNAME`: sync throws; fetch skips collection-add silently

## Key files

| File | Purpose |
|------|---------|
| `lib/discogs/client.ts` | API calls, rate limiter, format extractors |
| `lib/discogs/sync.ts` | `executeSync()` — pull + push |
| `app/api/records/search/route.ts` | Search endpoint |
| `app/api/records/fetch-from-discogs/route.ts` | Fetch + save |
| `app/api/records/update-from-discogs/route.ts` | Refresh existing |
| `app/api/records/sync/route.ts` | SSE sync |
| `app/api/records/sync/status/route.ts` | Env var check |
