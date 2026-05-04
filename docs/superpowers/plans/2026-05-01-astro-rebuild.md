# Astro Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Next.js web app with an Astro SSR app using `@astrojs/node`, preserving UI behavior, API contracts, and Render deployment.

**Architecture:** Astro owns pages and API endpoints under `src/pages`. Server API logic stays close to current handlers but returns standard `Response` objects instead of Next helpers. Browser interactivity moves to typed vanilla modules under `src/scripts`, with pure helper functions covered by Vitest.

**Tech Stack:** Astro SSR, `@astrojs/node`, Bun 1.3.13, TypeScript strict, Sass, Drizzle ORM, PostgreSQL, Vitest + jsdom.

---

## File structure

| Path | Responsibility |
|------|----------------|
| `astro.config.mjs` | Astro SSR config using `@astrojs/node` standalone adapter |
| `src/env.d.ts` | Astro ambient types |
| `src/layouts/BaseLayout.astro` | HTML shell, metadata, global CSS import |
| `src/pages/index.astro` | Home shell and app mounting DOM |
| `src/pages/am_i_evil.astro` | Health page at `/am_i_evil` |
| `src/pages/api/records.ts` | `GET`/`POST /api/records` |
| `src/pages/api/records/[id].ts` | `GET`/`PUT`/`DELETE /api/records/[id]` |
| `src/pages/api/records/search.ts` | Discogs search endpoint |
| `src/pages/api/records/fetch-from-discogs.ts` | Discogs fetch-and-save endpoint |
| `src/pages/api/records/update-from-discogs.ts` | Discogs refresh endpoint |
| `src/pages/api/records/sync.ts` | SSE sync endpoint |
| `src/pages/api/records/sync/status.ts` | Sync env readiness endpoint |
| `src/scripts/record-app.ts` | Browser state, rendering, event wiring |
| `src/scripts/record-helpers.ts` | Pure helpers for sorting, filtering, pagination, escaping, SSE parsing |
| `src/styles/*.scss` | Global/page/component styling imported by Astro |
| `__tests__/api/*.test.ts` | Astro endpoint tests |
| `__tests__/scripts/*.test.ts` | Browser helper tests |
| `README.md`, `docs/**/*.md`, `DEPLOYMENT.md` | Documentation updates |

### Task 1: Astro dependencies and configuration

**Files:**

- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `astro.config.mjs`
- Create: `src/env.d.ts`

- [ ] Add `astro` and `@astrojs/node`; remove Next/React runtime dependencies and Next lint config.
- [ ] Change scripts to `astro dev`, `astro build`, `node ./dist/server/entry.mjs`, and ESLint over `src lib __tests__ drizzle.config.ts vitest.config.ts vitest.setup.ts`.
- [ ] Configure Astro output `server` with Node standalone adapter.
- [ ] Run `bun install`, `bun run type-check`, and fix dependency/config errors.

### Task 2: Port API endpoints

**Files:**

- Create: `src/pages/api/records.ts`
- Create: `src/pages/api/records/[id].ts`
- Create: `src/pages/api/records/search.ts`
- Create: `src/pages/api/records/fetch-from-discogs.ts`
- Create: `src/pages/api/records/update-from-discogs.ts`
- Create: `src/pages/api/records/sync.ts`
- Create: `src/pages/api/records/sync/status.ts`
- Modify: `__tests__/api/*.test.ts`

- [ ] Port existing tests to import Astro endpoint functions and pass standard `Request` objects plus `params` where needed.
- [ ] Verify the ported tests fail because endpoints do not exist or return incorrect responses.
- [ ] Implement JSON and SSE helpers in each endpoint or local helper functions.
- [ ] Run `bun run test -- __tests__/api` until API tests pass.

### Task 3: Build Astro pages and vanilla client app

**Files:**

- Create: `src/layouts/BaseLayout.astro`
- Create: `src/pages/index.astro`
- Create: `src/pages/am_i_evil.astro`
- Create: `src/scripts/record-helpers.ts`
- Create: `src/scripts/record-app.ts`
- Modify: `__tests__/scripts/*.test.ts`

- [ ] Write failing helper tests for sort, size fallback, filtering, pagination, HTML escaping, and SSE parsing.
- [ ] Implement helpers minimally until tests pass.
- [ ] Build the home page shell with stable IDs/data attributes for vanilla script wiring.
- [ ] Implement browser rendering for sync warning/progress, search tabs/results, shelf controls, alpha nav, pagination, flip cards, update, delete confirmation, and inline errors.
- [ ] Run `bun run test -- __tests__/scripts` until tests pass.

### Task 4: Styling migration

**Files:**

- Create/modify: `src/styles/globals.scss`
- Create/modify: `src/styles/record-app.scss`
- Remove: Next CSS module usage after equivalent classes exist

- [ ] Move current global tokens, reset, animation, flip-card, page, search, shelf, alpha-nav, and card CSS into Astro-imported Sass.
- [ ] Preserve no-border-radius rule except the existing spinner implementation if retained by tests/visual behavior.
- [ ] Run `bun run build` and fix Sass/import errors.

### Task 5: Remove Next/React code and update tests

**Files:**

- Delete: `app/`, `components/`, `next.config.ts`, `next-env.d.ts`
- Modify: `vitest.config.ts`, `vitest.setup.ts`, `eslint.config.mjs`
- Modify/delete: old React component tests

- [ ] Remove obsolete Next/React source and tests once Astro equivalents pass.
- [ ] Update Vitest aliases and setup for Astro/client modules.
- [ ] Run `bun run test`, `bun run type-check`, and `bun run lint`.

### Task 6: Deployment and docs

**Files:**

- Modify: `Dockerfile`
- Modify: `render.yaml`
- Modify: `README.md`
- Modify: `DEPLOYMENT.md`
- Modify: `docs/development/README.md`
- Modify: `docs/development/coding-standards.md`
- Modify: `docs/api/README.md`
- Modify: `docs/components/*.md`
- Modify: `docs/testing.md`
- Modify: `docs/deployment/README.md`

- [ ] Update build/start commands to Astro Node server.
- [ ] Correct health path to `/am_i_evil` everywhere.
- [ ] Replace Next/React documentation with Astro/vanilla script documentation.
- [ ] Run `bun run lint:md`.

### Task 7: Final verification

**Files:**

- All changed files

- [ ] Run `bun run test`.
- [ ] Run `bun run type-check`.
- [ ] Run `bun run lint`.
- [ ] Run `bun run lint:md`.
- [ ] Run `bun run build`.
- [ ] Run `git status --short` and review all changes.
