# Discogs integration workflows

The web app is **read-only** toward Discogs (uses `DiscogsClient` from
`lib/discogs/client.ts` for GET requests only). The local database is a cached
mirror of the Discogs collection. The TUI is a separate client that still
supports search/fetch and two-way sync (documented below).

## Refresh (web)

Per-record "Update" → `POST /api/records/update-from-discogs` → `getRelease()`
→ extract metadata → update the cached `records` row. Read-only toward Discogs.

## Sync

### WebUI

`POST /api/records/sync` → SSE stream. Browser caller: `src/scripts/record-app.ts`.

Astro SSR blocks cross-site form-like POSTs. The sync button fetch must send `Content-Type: application/json` with a JSON body (`{}`); empty/bodyless POSTs can fail before the endpoint runs.

Pull-only (Discogs → local cache):

1. Build set of existing `discogsId` values
2. Page through `GET /users/{username}/collection/folders/0/releases`
3. Insert new releases (`pulled`); refresh existing ones (`updated`)
4. Emit `{ phase: "done" }`

There is no push phase. Sync never writes to Discogs and never deletes local
records. Requires `DISCOGS_USERNAME` + `DISCOGS_TOKEN`.

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
- Missing `DISCOGS_USERNAME`: sync throws

## Key files

| File | Purpose |
|------|---------|
| `lib/discogs/client.ts` | Read-only API calls, rate limiter, format extractors |
| `lib/discogs/sync.ts` | `executeSync()` — pull-only cache sync (WebUI) |
| `src/pages/api/records/update-from-discogs.ts` | Refresh one cached record |
| `src/pages/api/records/sync.ts` | SSE sync |
| `src/pages/api/records/sync/status.ts` | Env var check |
| `src/scripts/record-app.ts` | Browser sync button fetch + SSE parsing |
| `tui/ui/discogs.go` | TUI Discogs API calls + `executeSync()` (separate client) |
| `tui/db/records.go` | `db.Store` sync methods |
