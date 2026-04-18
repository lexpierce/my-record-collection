# Testing

## Web app

Vitest + React Testing Library. 194 tests, >90% coverage.

## Why Vitest, not `bun test`

`bun test` is incompatible with this suite. Do not migrate.

| Blocker | Detail |
|---------|--------|
| `vi.hoisted()` | Not implemented in `bun test` — API/lib mocks rely on it |
| `vi.mock()` factories | Bun's module mocker uses a different API |
| jsdom environment | `bun test` has no jsdom; component tests require a DOM |

## Commands

```bash
bun run test            # Run once
bun run test:watch      # Watch mode
bun run test:coverage   # With coverage
```

## Coverage thresholds

Lines: 90%, Statements: 90%, Functions: 90%, Branches: 80%.

## Config

`vitest.config.ts`, `vitest.setup.ts` (imports `@testing-library/jest-dom`; polyfills Bun-native APIs absent from Node.js). `@/*` alias mirrors `tsconfig.json`.

### Vitest runtime vs Bun runtime

Vitest workers run under **Node.js**, not Bun, even when launched via `bun run test`. The production app runs on **Bun**. These runtimes differ in ES2025 API coverage.

Rule: if an API is native in Bun but absent in Node.js, use it in production code and add a polyfill to `vitest.setup.ts`. See [TypeScript configuration](./development/typescript.md#es2025-api-availability) for the full table.

## Test structure

```text
__tests__/
├── api/                    # Route handler tests
├── components/             # Component tests
└── lib/                    # Utility tests
```

## Mocking patterns

### Database

```ts
const { mockSelect } = vi.hoisted(() => ({ mockSelect: vi.fn() }));
vi.mock("@/lib/db/client", () => ({
  getDatabase: () => ({ select: mockSelect, insert: vi.fn() }),
  schema: { recordsTable: { createdAt: "created_at", ... } },
}));
```

`drizzleChain` helper must include `$dynamic` in method list.

### drizzle-orm operators

```ts
vi.mock("drizzle-orm", () => ({
  asc: (col) => ({ asc: col }),
  desc: (col) => ({ desc: col }),
  inArray: (col, vals) => ({ inArray: { col, vals } }),
  eq: (col, val) => ({ eq: { col, val } }),
  and: (...args) => ({ and: args }),
}));
```

### GET request helper

```ts
function makeGetRequest(params = {}) {
  const url = new URL("http://localhost/api/records");
  for (const [key, val] of Object.entries(params)) {
    if (Array.isArray(val)) for (const v of val) url.searchParams.append(key, v);
    else url.searchParams.set(key, val);
  }
  return new NextRequest(url.toString());
}
```

### fetch (component tests)

URL-routing `mockImplementation`, not `mockReturnValueOnce` stacking:

```ts
global.fetch = vi.fn().mockImplementation((url) => {
  if (url.includes("/sync/status")) return syncMock();
  return Promise.resolve({ ok: true, json: async () => [] });
});
```

### next/image

Mock to plain `<img>`. Destructure out non-HTML props.

## Rules

- Test files that contain JSX must use `.tsx` extension, not `.ts` — Vitest/esbuild will fail to parse JSX in `.ts` files
- Fresh client per test (`beforeEach`)
- `vi.hoisted()` for mock variables in `vi.mock()` factories
- `getByRole("button", { name })` not `getByTitle`
- `getAllByText` when text on both card faces
- `encodeURIComponent()` for non-ASCII URL assertions

## Go TUI

```bash
cd tui/
go test ./... -cover          # All packages
go test ./ui/ -v              # Verbose single package
golangci-lint run             # Lint (errcheck, staticcheck, govet, gofmt)
```

### Coverage

| Package | Coverage | Strategy |
|---------|----------|----------|
| config | 96% | Temp files for `readKey`, `t.Setenv` for `Load` |
| db | 44% | Record methods unit-tested; CRUD needs real DB |
| ui | 98% | `db.Store` mock, `httptest` for image fetch |

### Mock store pattern

`db.Store` interface enables testing Model without a database:

```go
type mockStore struct {
    records []db.Record
    err     error
}
func (m *mockStore) List(_ context.Context) ([]db.Record, error) {
    return m.records, m.err
}
```

### Image tests

Use `net/http/httptest` to serve test PNGs. Create images with `image.NewRGBA`.

### Rules

- `t.Setenv` for env var tests (auto-restored)
- `t.TempDir` for config file tests (auto-cleaned)
- Table-driven tests for methods with multiple cases
- `httptest.NewServer` for HTTP tests (no real network)
- Add explicit tests for invalid numeric identifiers (`NaN`, non-numeric strings, unsafe integers)
- Add boundary tests for numeric ranges (min/max and just-outside values)
- Assert input length caps by attempting over-limit input and verifying truncation/rejection
