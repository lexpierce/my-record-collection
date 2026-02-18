# TODO

Known issues and future work. Items are roughly prioritised high/medium/low.

---

## High Priority

_(none)_

---

## Medium Priority

### Alphabetical pagination on `GET /api/records`

Deferred to its own session. Plan agreed:
- Server-side sort/filter via query params (`?sortBy=artist&sortDir=asc&size=12"&shaped=true`)
- New `GET /api/records/pages` endpoint returns alphabetical page buckets (≤100 records each; split by second letter if a letter exceeds the threshold)
- RecordShelf nav bar: buttons per bucket (e.g. "A–C", "D–F"), active bucket highlighted
- Load records for the selected bucket only

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

- [x] `GET /api/records` — sort newest-first (`desc(createdAt)`)
- [x] `SearchBar` — trim whitespace before search; closes programmatic bypass of `required` guard
- [x] Sync push phase — skip records already flagged `isSyncedWithDiscogs`; avoids redundant Discogs API calls
- [x] `DiscogsClient.makeRequest()` — retry-with-backoff on 429 (max 3 attempts, honours `Retry-After` header)
- [x] Sync config warning banner — `GET /api/records/sync/status` checks env vars; page shows amber banner if `DISCOGS_USERNAME` or `DISCOGS_TOKEN` missing
- [x] Accessibility — flip card `role=button`/`tabIndex`/`aria-expanded`/keyboard handler; filter `aria-expanded`/`role=group`; sort button `aria-label`; click-outside to close filter dropdown
- [x] Fixed `RecordCard` update/delete — replaced `window.location.reload()` with `onRecordMutated` callback; `RecordShelf` bumps `mutationKey` to re-fetch
- [x] Fixed `lib/db/client.ts` — lazy `getDatabase()` getter; no longer throws at import if `DATABASE_URL` unset
- [x] Fixed `AGENTS.md` — added `or tsconfig.json` fallback for tsconfig lookup (repo owner edit, commit 2238193)

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
