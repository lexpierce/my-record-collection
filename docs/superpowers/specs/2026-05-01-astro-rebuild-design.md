# Astro rebuild design

## Summary

Rebuild the web app as an Astro SSR application using `@astrojs/node`, Bun, Drizzle ORM, PostgreSQL, and vanilla browser scripts. Preserve user-facing behavior, API contracts, styling rules, and Render deployment semantics while removing Next.js and React from the web app.

## Decisions

| Area | Decision |
|------|----------|
| Framework | Astro SSR |
| Adapter | `@astrojs/node` |
| Runtime | Bun 1.3.14 |
| UI interactivity | Vanilla browser scripts, no React islands |
| Database | Existing Drizzle ORM schema and lazy `getDatabase()` pattern |
| API paths | Preserve existing records/Discogs API paths |
| Health path | `/am_i_evil` page, not `/api/am_i_evil` |
| Styling | Existing Sass/CSS token system, no Tailwind |
| Deployment | Render web service running Astro Node server |

## Architecture

| Current | Target |
|---------|--------|
| `app/page.tsx` | `src/pages/index.astro` |
| `app/am_i_evil/page.tsx` | `src/pages/am_i_evil.astro` |
| `app/api/**/route.ts` | `src/pages/api/**/*.ts` |
| `components/records/*.tsx` | `src/components/records/*.astro` + `src/scripts/*.ts` |
| `styles/globals.scss` | `src/styles/globals.scss` or retained root `styles/` imported by Astro |
| `next.config.ts` | Removed; replace image hostname needs with normal `<img>` usage |

## Pages

| Page | Requirements |
|------|--------------|
| `/` | Render header, sync controls, add-album panel, record shelf container, and script entrypoints |
| `/am_i_evil` | Preserve the current health check page behavior and visual output expected by deployment checks |

## API endpoints

| Endpoint | Target file | Notes |
|----------|-------------|-------|
| `GET /api/records` | `src/pages/api/records.ts` | Preserve query params and response format |
| `POST /api/records` | `src/pages/api/records.ts` | Preserve manual create behavior |
| `GET /api/records/[id]` | `src/pages/api/records/[id].ts` | Preserve UUID validation and response format |
| `PUT /api/records/[id]` | `src/pages/api/records/[id].ts` | Preserve update behavior |
| `DELETE /api/records/[id]` | `src/pages/api/records/[id].ts` | Preserve delete behavior |
| `GET /api/records/search` | `src/pages/api/records/search.ts` | Preserve Discogs search behavior |
| `POST /api/records/fetch-from-discogs` | `src/pages/api/records/fetch-from-discogs.ts` | Preserve fetch-and-save behavior |
| `POST /api/records/update-from-discogs` | `src/pages/api/records/update-from-discogs.ts` | Preserve update-from-Discogs behavior |
| `POST /api/records/sync` | `src/pages/api/records/sync.ts` | Preserve SSE progress stream |
| `GET /api/records/sync/status` | `src/pages/api/records/sync/status.ts` | Preserve env-var readiness response |

## Client behavior

| Feature | Requirement |
|---------|-------------|
| Sync status warning | Fetch `/api/records/sync/status` on load and render missing env vars |
| Sync collection | POST `/api/records/sync`, parse SSE chunks, update progress, refresh shelf on completion |
| Add album panel | Toggle search panel without page reload |
| Search | Support artist/title, catalog number, and UPC search tabs |
| Add result | POST `/api/records/fetch-from-discogs`, show success/error, refresh shelf |
| Shelf loading | Fetch `/api/records`, show loading/error/empty states |
| Sorting | Preserve artist/title/year sorting and direction toggle |
| Filtering | Preserve size and shaped/picture-disc filters |
| Alpha nav | Preserve `computeBuckets()` behavior and artist-only display |
| Pagination | Preserve `25`, `50`, `100` page sizes and current page controls |
| Cards | Preserve flip behavior, keyboard accessibility, update, delete confirmation, and inline errors |

## Styling

| Rule | Requirement |
|------|-------------|
| Color tokens | Keep Catppuccin Latte semantic tokens from `styles/_variables.scss` |
| CSS architecture | Use Sass/CSS files imported by Astro; no Tailwind |
| Border radius | `0` everywhere |
| Grid | `repeat(auto-fill, 270px)` and no ancestor `overflow-x: clip` |
| Fonts | Keep `var(--font-sans)` and `var(--font-mono)` usage |
| Images | Use standard `<img>` with existing dimensions and alt text |

## Data flow

1. Astro renders the static shell for `/`.
2. Vanilla client script fetches sync status and records after `DOMContentLoaded`.
3. User actions mutate records through existing API paths.
4. Successful add, update, delete, or sync calls refresh the shelf without a full-page reload.
5. Shared library code in `lib/` remains server-only unless explicitly safe for browser use.

## Error handling

| Case | Behavior |
|------|----------|
| API error | Return existing `{ error, message }` shape where current tests expect it |
| Shelf fetch failure | Show inline error text in shelf state area |
| Search failure | Show inline search error |
| Add/update/delete failure | Show inline action error |
| Sync stream failure | Show done-state progress with error message |
| Missing sync env vars | Show warning banner; sync button remains visible |

## Testing

| Layer | Tests |
|-------|-------|
| API | Port existing route tests to Astro endpoint request/response helpers |
| Client scripts | Test pure state helpers and DOM event behavior with Vitest + jsdom |
| Pagination | Keep existing `lib/pagination/buckets.ts` tests |
| Discogs | Keep existing `lib/discogs/*` tests |
| Build | `bun run type-check`, `bun run lint`, `bun run test`, `bun run build` |

## Documentation updates

| File | Required update |
|------|-----------------|
| `README.md` | Tech stack, commands, health path |
| `docs/development/README.md` | Astro layout and commands |
| `docs/development/coding-standards.md` | Replace Next/React-specific rules with Astro/browser rules |
| `docs/api/README.md` | Health path correction and endpoint file paths |
| `docs/components/*.md` | Replace React component references with Astro/script references |
| `docs/testing.md` | Replace React Testing Library component guidance with Astro/client-script testing guidance |
| `docs/deployment/README.md` and `DEPLOYMENT.md` | Render Astro Node server build/start commands |

## Out of scope

- Redesigning the UI.
- Changing the database schema.
- Changing public records/Discogs API response contracts.
- Adding authentication.
- Splitting the API into a separate service.
- Keeping React as an Astro integration or island framework.
