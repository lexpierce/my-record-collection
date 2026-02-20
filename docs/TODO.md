# TODO

Known issues and future work. Items are roughly prioritised high/medium/low.

---

## High Priority

None.

---

## Medium Priority

None.

---

## Low Priority

None.

---

## Completed (this session)

- [x] Removed `max-width: 80rem` from `.shelfSection` in `app/page.module.scss` — the record grid now fills the full viewport width so `auto-fill` packs as many 180px columns as the screen allows.
- [x] Updated `docs/ui-ux.md` Layout section to reflect that the shelf section no longer has a max-width cap (header/search/sync sections still use `80rem`).
- [x] Responsive initial page size: 50 on desktop (>640px), 25 on mobile (≤640px) via lazy `useState` initializer in `RecordShelf.tsx`.
- [x] Removed redundant `paths: ["**"]` from `render.yaml` buildFilter — `ignoredPaths` alone is sufficient.

---

## Completed (previous sessions)

- [x] `RecordCard` — replaced `window.confirm()` / `window.alert()` with inline confirmation UI and inline error state; no blocking dialogs.
- [x] `SearchBar` — fixed `setTimeout` leak: timer now lives in a `useEffect` with a `clearTimeout` cleanup.
- [x] `RecordCard` — `discogsUri` rendered as a clickable "View on Discogs" link on the card back.
- [x] `sync.ts` — eliminated N+1 `DiscogsClient` instances: `collectionReleaseToRecord()` now accepts the shared client as a parameter.
- [x] Created `.markdownlint.json` (referenced by `docs/STYLE_GUIDE.md`).
- [x] Wrote `docs/api/endpoints/records-crud.md` — GET/POST /api/records, GET/PUT/DELETE /api/records/[id].
- [x] Wrote `docs/api/endpoints/discogs-integration.md` — search, fetch-from-discogs, update-from-discogs, sync.
- [x] `docs/development/README.md` — ticked `database-schema.md` and `testing.md` checkboxes (existing files cover intent); wrote `api-design-patterns.md` and ticked its checkbox.
- [x] Wrote `docs/features/discogs-integration.md` — search flow, fetch flow, sync flow, rate limiting, edge cases.

- [x] Alphabetical pagination — `GET /api/records` gains optional query params (`sortBy`, `sortDir`, `size`, `shaped`); `lib/pagination/buckets.ts` provides `computeBuckets()` + `artistSortKey()`; `AlphaNav` component renders letter-bucket nav bar; `RecordShelf` shows `AlphaNav` when sorted by artist, filters grid to active bucket; auto-splits letters exceeding `MAX_BUCKET_SIZE` (default 100) by second character.

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
