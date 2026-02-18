# TODO

Known issues and future work. Items are roughly prioritised high/medium/low.

---

## High Priority

### RecordCard update/delete still uses `window.location.reload()`

`components/records/RecordCard.tsx` calls `window.location.reload()` after a successful update or delete (`handleUpdateFromDiscogs`, `handleDeleteAlbum`). This blows away all React state — scroll position, open filters, etc.

**Fix:** Pass a `onRecordMutated` callback from `RecordShelf` (or use a React context/store) so the shelf can re-fetch without a full reload. The `refreshKey` pattern used for sync already exists in `app/page.tsx` — extend it down to the card level.

---

### `lib/db/client.ts` throws at import time if `DATABASE_URL` unset

```ts
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not defined...");
}
```

This makes the module un-importable during `next build` if `DATABASE_URL` is not in the build environment. It causes confusing "module threw at import time" errors in CI/CD pipelines that don't have the env var set.

**Fix:** Defer the check to first use (lazy initialisation), or use a build-time environment variable stub (`NEXT_PUBLIC_` prefix approach won't work here — use `@t3-oss/env-nextjs` or similar).

---

## Medium Priority

### `GET /api/records` sorts ascending by `createdAt` (oldest first)

The comment previously said "newest first" — this was fixed in code and docs. But the UX expectation is likely newest-first. Confirm with product intent and add a `desc(createdAt)` sort or expose it as a query parameter.

---

### No `DISCOGS_USERNAME` in `.env.example` reminder for sync

Sync silently fails with a 200 SSE stream that immediately returns an error event if `DISCOGS_USERNAME` is not set. The error message is clear (`DISCOGS_USERNAME environment variable is required for sync`) but the user has to look at the error overlay to see it.

**Fix:** Surface the missing env var as a more prominent UI warning before/during the first sync attempt.

---

### Accessibility audit

The app has no ARIA roles beyond what the browser provides natively. No screen-reader testing has been done. Known issues:
- Filter dropdown is not keyboard navigable
- Flip card click target has no `role="button"` or `aria-expanded`
- Sort direction button title is not announced on focus

---

### `SearchBar` validation gap

When the "Artist & Title" tab is active but the user clears both fields and submits, the `required` HTML attribute on the inputs prevents submission. However, if JS is used to set values programmatically (e.g. autofill), empty strings could bypass the guard. The server-side route handles this gracefully (returns 400), but the client could be more robust.

---

### Rate limiter doesn't backoff on 429 responses

`DiscogsClient.makeRequest()` throws on any non-2xx response including 429 (Too Many Requests). It does not retry with exponential backoff. Under heavy use (bulk sync of large collections), this can cause sync to fail partway through.

**Fix:** Add retry-with-backoff logic to `makeRequest()` for 429 responses.

---

### No pagination on `GET /api/records`

The route fetches all records in one query. For large collections (1000+ records), this will be slow and memory-intensive.

**Fix:** Add `page` and `limit` query parameters. Update `RecordShelf` to paginate or use virtual scrolling.

---

### Sync `push` phase uses real Discogs collection contents

`executeSync()` compares local records against the live Discogs collection to decide what to push. For large collections, this means a full collection paginate on every sync. Consider caching the Discogs IDs or using the `isSyncedWithDiscogs` flag more aggressively (with a "force re-sync" option).

---

## Low Priority

### `window.confirm()` and `window.alert()` in RecordCard

Native `confirm()` and `alert()` are blocking, don't match the app's visual style, and are hard to test. Replace with an inline confirmation UI (e.g. a small "Are you sure? [Yes] [No]" that appears below the Delete button).

---

### `SearchBar` success message auto-hides via `setTimeout`

```ts
setTimeout(() => setSuccessMessage(""), 3000);
```

The timeout is not cleaned up if the component unmounts before 3 s. Use a `useEffect` with a cleanup function to avoid the React "update on unmounted component" warning.

---

### No `discogsUri` link on the card back

The `discogsUri` field is stored in the database and shown as a plain field. It could be a clickable link to the Discogs release page.

---

### `sync.ts` creates a new `DiscogsClient` inside `collectionReleaseToRecord()`

`collectionReleaseToRecord()` calls `createDiscogsClient()` on every release in the collection. This creates N+1 client instances (each with its own rate limiter state). The rate limiter works correctly because the actual requests are made by `executeSync`'s shared client — the inner client is only used for format extraction helpers, which don't call `fetch`. But it's wasteful and confusing.

**Fix:** Pass the existing client as a parameter to `collectionReleaseToRecord()` instead of creating a new one.

---

### Missing `markdownlint` configuration

`docs/STYLE_GUIDE.md` references a `.markdownlint.json` config file that doesn't exist. Either create it or remove the reference.

---

### `docs/api/README.md` endpoint checklist items are unchecked

The individual endpoint documentation checklist still has unchecked items. Write detailed endpoint docs for the remaining routes (sync, fetch-from-discogs, update-from-discogs, records CRUD).

---

## Completed (this session)

- [x] Removed dead `eq` import from `app/api/records/route.ts`
- [x] Fixed `any[]` type in `SearchBar.tsx` → `DiscogsSearchResult[]`
- [x] Replaced `window.location.reload()` in `app/page.tsx` post-sync with `refreshKey` bump
- [x] Removed unused `__filename`/`__dirname` from `eslint.config.mjs`
- [x] Fixed `createDiscogsClient()` doc comment — removed incorrect "singleton" claim
- [x] Fixed stale "newest first" comment in `app/api/records/route.ts`
- [x] Added comments to all source files
- [x] Set up Vitest + React Testing Library with 157 tests, >90% coverage
- [x] Fixed README.md — Tailwind→Sass, completed API list, added test scripts
- [x] Fixed DEPLOYMENT.md — PostgreSQL 16→18
- [x] Fixed `docs/README.md` — removed phantom file references, updated directory tree
- [x] Fixed `docs/features/flip-card-animation.md` — grid CSS, border color, JSX cursor class
- [x] Fixed `docs/features/vinyl-metadata.md` — replaced Tailwind class examples with CSS module classes
- [x] Fixed `docs/components/README.md` — checked RecordShelf and SearchBar entries
- [x] Wrote `docs/components/record-shelf.md`
- [x] Wrote `docs/components/search-bar.md`
- [x] Wrote `docs/development/database-schema.md`
- [x] Wrote `docs/testing.md`
- [x] Wrote `docs/error-handling.md`
- [x] Wrote `docs/ui-ux.md`
- [x] Updated `.env.example` with better comments
- [x] Added `coverage/` and `.next/` to eslint ignore list
