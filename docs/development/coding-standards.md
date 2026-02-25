# Coding standards

Rules enforced across the codebase. Violations should be fixed immediately.

## General

### Naming

Use verbose, descriptive names. No abbreviations.

```typescript
// YES
const handleUpdateFromDiscogs = async () => { ... }
// NO
const update = async () => { ... }
```

### Verifying before deleting

Before removing any import, field, variable, or function: `grep -rn "<name>" app/ lib/ components/`. Static analysis misses cross-file usages.

### Interface field hygiene

Only define fields that are read somewhere. Dead fields widen contracts and mislead.

### Comments

Explain *why*, not *what*.

## TypeScript

### Strict mode

Always fully typed. No `any`.

### Lazy database getter

Never export the Drizzle client at module level. Use `getDatabase()`:

```typescript
let _db: ReturnType<typeof drizzle> | null = null;
export function getDatabase() {
  if (!_db) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
    _db = drizzle(process.env.DATABASE_URL, { schema });
  }
  return _db;
}
```

Mock as `getDatabase: () => ({ select: vi.fn()... })`, not `database: { ... }`.

### GET handler signature

Always accept `NextRequest`, even if params unused now:

```typescript
export async function GET(request: NextRequest) { ... }
```

### Dynamic Drizzle queries

Use `$dynamic()` for conditional `where()`:

```typescript
let query = getDatabase().select().from(recordsTable).$dynamic();
const conditions = [];
if (sizeValues.length > 0) conditions.push(inArray(recordsTable.recordSize, sizeValues));
if (conditions.length > 0) query = query.where(and(...conditions));
```

Import all drizzle-orm operators at file top. Never use dynamic `import()`.

## React components

### Client vs server

Mark interactive components with `"use client"`.

### Props interfaces

Define above component. Always typed.

### No `window.location.reload()`

Use callback pattern: child calls `onRecordMutated()`, parent bumps
`mutationKey` counter, `useEffect` re-fetches.

### No redundant boolean state

Derive from existing state instead of tracking separately.

### Accessibility for interactive divs

Required attrs: `role="button"`, `tabIndex={0}`, `aria-expanded`, `onKeyDown` (Enter/Space).

## Next.js

### Images

Always `next/image`, never `<img>`. Never add `unoptimized` per-image — control in `next.config.ts` only.

Register external hostnames in `images.remotePatterns`.

### ISR

Not applicable. Page is `"use client"`. Don't add `export const revalidate`.

## Styling

### No Tailwind

Sass CSS Modules exclusively. No Tailwind classes anywhere.

### CSS custom properties

All colors in `styles/_variables.scss`. Reference via `var(--token)`. Never hardcode hex in modules.

### Global vs module classes

Global classes (`globals.scss`) only when JS toggles by string (e.g. `flip-card`, `flipped`). Everything else in `.module.scss`.

### Border radius

`0` everywhere. Sharp edges.

### Button sizing

Never `flex: 1` on buttons. Use `padding` + `white-space: nowrap`.

### SCSS variables

Only define if used in that file. No dead variables.

### Card sizing

180px wide (250px flipped), content-driven height (no min-height).

### CSS 3D anti-patterns

| Rule | Why |
|------|-----|
| `transform-style: preserve-3d` only on `.flip-card-inner` | On faces: breaks `backface-visibility` |
| `filter` only on `.flip-card`, never `.flip-card-inner` | Flattens 3D transforms |
| `.flip-card-back { height: auto }` not `100%` | `100%` clips content |
| No `overflow-x: clip` on grid ancestors | Clips both axes per spec |

### Layout anti-patterns

No `height: 100%` + `justify-content: space-between`. Let content determine size. Use `gap`.

### Font sizes

| Element | Size |
|---------|------|
| Card title (front + back) | `0.75rem` bold |
| Card artist | `0.75rem` |
| Dense metadata (back) | `0.625rem` (10px) |
| Buttons (back) | `0.625rem` |

## Pagination algorithm

Two-pass: split then merge. See `lib/pagination/buckets.ts`.

1. **Split**: groups exceeding `MAX_SIZE` split by second character
2. **Merge**: adjacent small pages merged greedily up to `MAX_SIZE`

Invariants:

- Sub-groups from a split are never merged with other groups
- `#` bucket always last, never split/merged

## Shared utility modules

Logic needed by both components and server code lives in `lib/<domain>/`.
Never duplicate in component files.

## Go TUI

### Bubble Tea v2 API

| v1 | v2 |
|----|----|
| `tea.KeyMsg` | `tea.KeyPressMsg` |
| `View() string` | `View() tea.View` → `tea.NewView(s)` |
| `lipgloss.AdaptiveColor{...}` | `lipgloss.Color("#hex")` |
| `github.com/charmbracelet/bubbletea` | `charm.land/bubbletea/v2` |
| `github.com/charmbracelet/lipgloss` | `charm.land/lipgloss/v2` |

### Lip Gloss v2 + escape sequences

`lipgloss.JoinHorizontal` corrupts terminal image escape sequences (kitty, iTerm2, sixel). Render info above image for native protocols. Mosaic (plain text) can use `JoinHorizontal`.

### Image protocol detection

| Env var | Value | Protocol |
|---------|-------|----------|
| `TERM_PROGRAM` | `kitty` | kitty |
| `TERM` | `xterm-kitty` | kitty |
| `KITTY_WINDOW_ID` | any | kitty |
| `TERM_PROGRAM` | `iTerm.app` / `WezTerm` | iTerm2 |
| none matched | — | mosaic fallback |

### Config

`~/.config/myrecords/config.toml` with `database_url` key. `DATABASE_URL` env var overrides. Simple line parser (no TOML library).

### go.sum maintenance

After `go get`, gopls may cache stale errors. Run `go build ./...` to verify, then restart gopls.

```bash
go get <module>@<version>
go build ./...        # verify
go mod tidy           # clean up
```

### db.Connect()

Accepts URL as parameter. Caller owns config. Testable.

```go
func Connect(databaseURL string) (*pgxpool.Pool, error)
```

## Testing

Run before committing:

```bash
bun run lint          # ESLint
bun run lint:md       # Markdown lint
bun run type-check    # TypeScript
bun run test          # Vitest (195 tests, >90% coverage)
bun run build         # Production build
```

### Test isolation

Fresh client per test (`beforeEach`). Shared clients leak rate-limiter state.

### URL-routing mocks

For components that fire multiple fetches: use `mockImplementation` routing by URL, not `mockReturnValueOnce` stacking.

### Query helpers

Use `getByRole("button", { name })`, not `getByTitle`. Use `getAllByText` when text appears on both card faces.

### Non-ASCII in URL tests

Use `encodeURIComponent()` to generate expected strings. Never hardcode percent-encoded values.

## Commit messages

```text
feat: Add vinyl color extraction to search results
fix: Prevent text bleed-through on flip cards
docs: Document flip card animation implementation
```
