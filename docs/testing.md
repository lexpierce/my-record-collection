# Testing

## Web app

Vitest + jsdom. API tests import Astro endpoint functions and pass standard `Request` objects. Browser logic tests target pure helpers in `src/scripts/record-helpers.ts`.

## Why Vitest, not `bun test`

`bun test` is incompatible with this suite. Do not migrate.

| Blocker | Detail |
|---------|--------|
| `vi.hoisted()` | API/lib mocks rely on it |
| `vi.mock()` factories | Bun's module mocker uses a different API |
| jsdom environment | Browser helper and DOM tests require a DOM |

## Commands

```bash
bun run test
bun run test:watch
bun run test:coverage
```

## Local dev verification

Use `.env.dev` when reproducing web app bugs that depend on live services:

```bash
set -a; . ./.env.dev; set +a; bun run dev -- --host 127.0.0.1 --port 4321
```

For sync regressions, verify `POST /api/records/sync` returns `200` + `text/event-stream`, then press the Sync Collection button in the browser.

## Dependency prerequisite

Run `bun install` before tests when `node_modules/` is empty or `tsconfig.json` extends fail. Missing dependencies can surface as `TSConfckParseError` for `astro/tsconfigs/strict`.

## Config

| File | Purpose |
|------|---------|
| `vitest.config.ts` | jsdom environment, `@/*` alias, coverage config |
| `vitest.setup.ts` | jest-dom import and Bun API polyfills for Node test runtime |

## Test structure

```text
__tests__/
├── api/        # Astro endpoint tests
├── scripts/    # Browser helper tests
└── lib/        # Utility and Discogs tests
```

## API endpoint pattern

```ts
const response = await GET({
  request: new Request("http://localhost/api/records?sortBy=artist"),
});
const body = await response.json();
expect(body.records).toHaveLength(1);
```

Dynamic routes receive params:

```ts
await DELETE({
  request: new Request("http://localhost/api/records/uuid-1", { method: "DELETE" }),
  params: { id: "uuid-1" },
});
```

## Mocking rules

| Dependency | Rule |
|------------|------|
| Database | Mock `getDatabase()` with Drizzle chain helpers |
| Discogs | Mock `createDiscogsClient()` methods |
| `drizzle-orm` operators | Return inspectable plain objects |
| fetch | Use URL-routing `mockImplementation`, not `mockReturnValueOnce` stacks |
| `window.prompt` | jsdom does not implement it; stub with `vi.spyOn(window, "prompt").mockReturnValue(...)` or it logs `Not implemented` and returns `undefined` |

## jsdom environment

`fetch`, `Headers`, `Response`, and `ReadableStream` are native globals in the `jsdom` test environment — no polyfill needed. `vitest.setup.ts` only polyfills `Map.prototype.getOrInsert(Computed)` (not yet in Node's V8, but used at runtime under Bun).

## Testing modules with top-level side effects

`src/scripts/record-app.ts` has no exports and runs init code (event wiring, initial fetch) at module scope on import. To test it:

1. Build the same `data-*` markup as the consuming `.astro` page before each test.
2. Mock `fetch` with a path-based router (`GET /api/records`, etc.), not per-call stacks.
3. `vi.resetModules()` then dynamically `import()` the module fresh per test so its top-level init runs against the new DOM/mock state.
4. `await vi.waitFor(() => expect(...))` to await the fire-and-forget async init before asserting — the module's top-level calls are not awaited by the test.

See `__tests__/scripts/record-app.test.ts` for the full pattern, including SSE-stream mocking via a `ReadableStream` that enqueues `TextEncoder`-encoded `data: ...\n\n` chunks.

## Rules

- Fresh client/mock state per test (`beforeEach`).
- Use `vi.hoisted()` for values referenced by `vi.mock()` factories.
- Use standard `Request`, not framework-specific request classes.
- Test browser behavior in pure helpers first; add DOM tests only when event wiring matters.
- Use `encodeURIComponent()` for non-ASCII URL assertions.

## Go TUI

```bash
cd tui/
go test ./... -cover
go test ./ui/ -v
golangci-lint run
```
