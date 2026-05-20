# Discogs integration workflows

Three workflows, all using `DiscogsClient` from `lib/discogs/client.ts`.

## Search

`SearchBar` → `GET /api/records/search` → Discogs search → `getRelease()` per result (max 10) → enriched results returned.

Failed enrichment per-result: original result returned without format fields.

## Fetch

`SearchBar` "+ Add" → `POST /api/records/fetch-from-discogs` → `getRelease()` → extract metadata → insert `records` row → attempt `addToCollection()` (best-effort, 409 = already synced).

## Sync

### WebUI

`POST /api/records/sync` → SSE stream. Browser caller: `src/scripts/record-app.ts`.

Astro SSR blocks cross-site form-like POSTs. The sync button fetch must send `Content-Type: application/json` with a JSON body (`{}`); empty/bodyless POSTs can fail before the endpoint runs.

#### Pull (Discogs → local)

1. Build set of existing `discogsId` values
2. Page through `GET /users/{username}/collection/folders/0/releases`
3. Skip existing, insert new
4. Mark all matched records `isSyncedWithDiscogs = true`

#### Push (local → Discogs)

1. Find records with `discogsId` + `isSyncedWithDiscogs = false`
2. Call `addToCollection()` for each
3. Emit `{ phase: "done" }`

Idempotent. Never deletes. Requires `DISCOGS_USERNAME` + `DISCOGS_TOKEN` (both config file keys or env var overrides).

### TUI

`s` key in list view → `executeSync(store, username, dcfg, onProgress)` in `tui/ui/discogs.go`.

Same two-phase pull + push logic. Uses `db.Store` methods directly (no HTTP).

Credentials passed as `discogsConfig{token, userAgent}`. `executeSync` returns error immediately if `username` or `dcfg.token` is empty.

`runSync` returns `syncDoneMsg{err, progress}` — progress counts and per-record errors are propagated to model state.

| Phase | Store method |
|-------|-------------|
| Pull — existing IDs | `store.ListDiscogsIDs()` |
| Pull — insert new | `store.Create()` |
| Pull — mark synced | `store.MarkSyncedWithDiscogs()` |
| Push — candidates | `store.ListUnsyncedDiscogsRecords()` |
| Push — add to Discogs | `addToDiscogsCollection()` (direct API) |

Progress displayed live in `renderList()`. Summary shown after completion; cleared on next keypress.

## Edge cases

- Duplicate `discogs_id` insert → counted as `skipped`
- 429 → auto-retry (3 attempts, `Retry-After`) — WebUI only; TUI propagates error
- `isSyncedWithDiscogs` is display-only; sync uses live Discogs contents as truth
- Missing `DISCOGS_USERNAME`: sync throws; fetch skips collection-add silently

## Key files

| File | Purpose |
|------|---------|
| `lib/discogs/client.ts` | API calls, rate limiter, format extractors |
| `lib/discogs/sync.ts` | `executeSync()` — pull + push (WebUI) |
| `src/pages/api/records/search.ts` | Search endpoint |
| `src/pages/api/records/fetch-from-discogs.ts` | Fetch + save |
| `src/pages/api/records/update-from-discogs.ts` | Refresh existing |
| `src/pages/api/records/sync.ts` | SSE sync |
| `src/pages/api/records/sync/status.ts` | Env var check |
| `src/scripts/record-app.ts` | Browser sync button fetch + SSE parsing |
| `tui/ui/discogs.go` | TUI Discogs API calls + `executeSync()` |
| `tui/db/records.go` | `db.Store` sync methods |
