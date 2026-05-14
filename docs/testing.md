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
