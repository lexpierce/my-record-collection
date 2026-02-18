# Testing

This project uses **Vitest** with **React Testing Library** for unit and component tests.

## Running Tests

```bash
# Run all tests once
bun run test

# Watch mode (re-runs on file changes)
bun run test:watch

# Run with coverage report
bun run test:coverage
```

## Coverage Thresholds

| Metric | Threshold |
|---|---|
| Lines | 90% |
| Statements | 90% |
| Functions | 90% |
| Branches | 80% |

The build will fail if coverage drops below these thresholds.

## Stack

| Package | Purpose |
|---|---|
| `vitest` | Test runner, assertion library |
| `@vitejs/plugin-react` | JSX transform for component tests |
| `@testing-library/react` | DOM rendering and querying |
| `@testing-library/user-event` | Realistic user interactions (typing, clicking) |
| `@testing-library/jest-dom` | DOM-specific matchers (`toBeInTheDocument`, etc.) |
| `jsdom` | Browser DOM simulation in Node |
| `msw` | (Available for future API mocking via service workers) |
| `@vitest/coverage-v8` | V8-based coverage collection |

## Configuration

- `vitest.config.ts` — test environment, setup files, coverage settings
- `vitest.setup.ts` — imports `@testing-library/jest-dom` to add DOM matchers

The `@/*` path alias mirrors `tsconfig.json` so imports like `@/lib/discogs/client` resolve correctly in tests.

## Test Structure

```
__tests__/
├── api/
│   ├── am_i_evil.test.ts          # Health check endpoint
│   ├── fetch-from-discogs.test.ts # POST /api/records/fetch-from-discogs
│   ├── records.test.ts            # GET and POST /api/records
│   ├── records-id.test.ts         # GET, PUT, DELETE /api/records/[id]
│   ├── records-search.test.ts     # GET /api/records/search
│   ├── sync.test.ts               # POST /api/records/sync (SSE)
│   └── update-from-discogs.test.ts
├── components/
│   ├── HomePage.test.tsx          # app/page.tsx
│   ├── RecordCard.test.tsx
│   ├── RecordShelf.test.tsx
│   └── SearchBar.test.tsx
└── lib/
    └── discogs/
        ├── client.test.ts         # DiscogsClient class
        └── sync.test.ts           # executeSync()
```

## Mocking Strategy

### Database (API route tests)

The database module (`@/lib/db/client`) is mocked with `vi.mock()`. All Drizzle builder methods (`select`, `from`, `where`, etc.) are stubbed to return a chainable object that resolves to a configurable value.

**Important:** `vi.mock()` factories are hoisted to the top of the file by Vitest. Use `vi.hoisted()` to declare mock variables that are referenced inside factory functions:

```ts
const { mockSelect } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  database: { select: mockSelect },
  schema: { recordsTable: {} },
}));
```

### Discogs Client (sync and route tests)

`@/lib/discogs/client` is mocked entirely. Individual methods (`getUserCollection`, `getRelease`, etc.) are `vi.fn()` stubs configured per test.

### `fetch` (component tests)

`globalThis.fetch` is spied on with `vi.spyOn`. Each test configures return values with `mockResolvedValue` or `mockReturnValueOnce`.

### Next.js `Image` (component tests)

The `next/image` module is mocked to render a plain `<img>` element. Non-HTML props (`unoptimized`, `fill`, etc.) are destructured out to avoid React DOM warnings:

```tsx
vi.mock("next/image", () => ({
  default: ({ src, alt, width, height, className, style }) => (
    <img src={src} alt={alt ?? ""} width={width} height={height}
         className={className} style={style} />
  ),
}));
```

## Writing New Tests

1. Create a file under `__tests__/` matching the source path.
2. Use `vi.hoisted()` for any mock variables referenced in `vi.mock()` factories.
3. Add `beforeEach(() => vi.clearAllMocks())` to reset mock state between tests.
4. For React components, wrap renders in `waitFor()` when asserting on async state.
5. Run `bun run test:coverage` to verify thresholds are still met.

## Common Patterns

### Testing an async state update

```tsx
import { render, screen, waitFor } from "@testing-library/react";

it("shows data after fetch", async () => {
  fetchSpy.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ records: [] }) });
  render(<RecordShelf />);
  await waitFor(() => {
    expect(screen.getByText(/empty/i)).toBeInTheDocument();
  });
});
```

### Testing a button click that triggers a fetch

```tsx
import userEvent from "@testing-library/user-event";

it("calls API when button clicked", async () => {
  render(<MyComponent />);
  await userEvent.click(screen.getByRole("button", { name: /submit/i }));
  expect(fetchSpy).toHaveBeenCalledWith("/api/endpoint", expect.any(Object));
});
```

### Testing Drizzle chain methods

```ts
function drizzleChain(resolveValue: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "from", "where", "set", "returning"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Make thenable so `await db.select().from(...)` works
  chain.then = (resolve: (v: unknown) => void) => resolve(resolveValue);
  return chain;
}
```

## Related

- [Development Guidelines](./development/README.md)
- [Coding Standards](./development/coding-standards.md)
