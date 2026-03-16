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

**Acronym casing**: Acronyms follow camelCase position — all-caps when leading a
capitalized segment, all-lowercase when starting a local variable.

| Context | Correct | Wrong |
|---------|---------|-------|
| Local variable | `databaseURL`, `baseURL`, `releaseID` | `databaseUrl`, `baseUrl`, `releaseId` |
| camelCase field | `thumbnailUrl` → NO — Drizzle schema exception (see below) | — |
| Class private field | `baseURL` | `baseUrl` |

Drizzle ORM schema fields use lowercase acronyms (`discogsId`, `thumbnailUrl`,
`coverImageUrl`) because Drizzle's snake_case→camelCase mapping produces that
form. This is intentional and consistent; do not change schema field names.

**Private implementation details**: The verbose-name rule has one carve-out —
private fields/variables that never appear in a public API may use established
abbreviations when the full form is disproportionately long.

```typescript
private readonly minDelayMs: number;  // YES — private, Ms is established
private readonly minimumDelayMilliseconds: number;  // NO — over-verbose
```

### Verifying before deleting

Before removing any import, field, variable, or function: `rg -n "<name>" app/ lib/ components/`. Static analysis misses cross-file usages.

### Tool preferences

Use `rg` (ripgrep) instead of `grep`. Use `fd` instead of `find`.

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

All colors in `styles/_variables.scss`. Colorscheme: Catppuccin Latte. Two layers:

1. Raw palette: `--ctp-<name>` (e.g. `--ctp-blue`, `--ctp-text`).
2. Semantic tokens: `--warm-*` mapped to `var(--ctp-*)` — always reference semantic tokens in modules.

Never hardcode hex in modules. Never use `--ctp-*` directly in modules.

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

See [UI/UX reference](../ui-ux.md#typography) for the full table.

Rules:

- `var(--font-sans)` (`"Input Sans"`, system-ui fallback) is the default everywhere.
- `var(--font-mono)` (`"Input Mono"`, ui-monospace fallback) for identifier-like values: Cat#, Year, Discogs ID.
- Font files in `public/fonts/`; free download at <https://input.djr.com/download/>.
- No `px` values except the filter badge (`10px`).

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

### Go naming conventions

Go naming diverges from the TypeScript rule above. Apply Go idiom strictly:

| Rule | Correct | Wrong |
|------|---------|-------|
| Acronyms all-caps | `baseURL`, `releaseID`, `discogsID`, `dst` | `baseUrl`, `releaseId`, `destination` |
| Short locals in tight scope | `n`, `s`, `v`, `dst` | `number`, `asString`, `destination` |
| No type suffix on locals | `discogsID` (local `string`) | `discogsIDStr` |
| Receiver: 1-2 letter abbreviation | `func (m Model)` | `func (model Model)` |

The verbose-name rule in **General / Naming** above applies to TypeScript only.

### Go version

`go 1.26.1`. Apply Go 1.26 language features where they improve clarity:

| Pattern | Go 1.26 form |
|---------|-------------|
| `var e ErrType; if errors.As(err, &e) && e.Field == x` | `if e, ok := errors.AsType[ErrType](err); ok && e.Field == x` |
| `v := expr; return &v` | `return new(expr)` |

### Bubble Tea v2 API

| v1 | v2 |
|----|----|
| `tea.KeyMsg` | `tea.KeyPressMsg` |
| `msg.String()` key matching | `tea.KeyPressMsg{Code: rune, Mod: tea.KeyMod}` |
| `tea.KeyCtrlC` | `tea.KeyPressMsg{Code: 'c', Mod: tea.ModCtrl}` |
| `View() string` | `View() tea.View` → `tea.NewView(s)` |
| read view as string | `view.Content` (not `.Body()` — no such method) |
| `lipgloss.AdaptiveColor{...}` | `lipgloss.Color("#hex")` |
| `github.com/charmbracelet/bubbletea` | `charm.land/bubbletea/v2` |
| `github.com/charmbracelet/lipgloss` | `charm.land/lipgloss/v2` |

### Lip Gloss v2 + escape sequences

`lipgloss.JoinHorizontal` corrupts terminal image escape sequences (kitty, iTerm2, sixel). Render info above image for native protocols. Mosaic (plain text) can use `JoinHorizontal`.

### Image protocol detection

| Env var | Value | Protocol |
|---------|-------|----------|
| `TERM_PROGRAM` | `kitty` / `ghostty` | kitty |
| `TERM` | `xterm-kitty` / `xterm-ghostty` | kitty |
| `KITTY_WINDOW_ID` | any | kitty |
| `TERM_PROGRAM` | `iTerm.app` / `WezTerm` | iTerm2 |
| none matched | — | mosaic fallback |

`TERM`-based detection matters inside tmux/screen where `TERM_PROGRAM` gets stripped.

### Kitty graphics protocol pitfalls

| Rule | Why |
|------|-----|
| Always set `ImageWidth` + `ImageHeight` when using `Format: kitty.RGBA` or `kitty.RGB` | Raw pixel data has no header; terminal cannot infer dimensions without `s=`/`v=` options |
| `kitty.PNG` format does not need explicit dimensions | PNG header encodes width/height |
| Upstream `Options.Quite` is a typo for "Quiet" | Don't "fix" it — matches the library API (`q=` suppression level 0/1/2) |

### Kitty images in Bubble Tea — virtual placements

Bubble Tea v2's renderer converts `View.Content` into a cell buffer. Raw Kitty graphics escape sequences embedded in content are destroyed during the cell-buffer diff/repaint cycle — the image flashes once then disappears.

**Correct approach**: use Kitty's Unicode virtual placement protocol.

| Step | Mechanism | Where |
|------|-----------|-------|
| 1. Transmit image data to terminal memory | `tea.Raw()` cmd with `kitty.EncodeGraphics` (`Action: kitty.TransmitAndPut`, `VirtualPlacement: true`, `ID: <n>`) | `imageLoadedMsg` handler in `Update()` |
| 2. Render placeholder grid in view | `U+10EEEE` chars with row/column diacritics, image ID encoded as SGR foreground color (`\033[38;5;<id>m`) | `View()` content string |
| 3. Terminal maps placeholders to image | Kitty/Ghostty replaces placeholder cells with stored image pixels | Automatic |

Key types in `tui/ui/image.go`:

```go
type kittyResult struct {
    transmit    string // raw escape sequence → tea.Raw()
    placeholder string // U+10EEEE grid → View content
}

type cachedImage struct {
    render   string // placeholder text (or mosaic/sixel output)
    transmit string // raw escape sequence (kitty only, empty for others)
}
```

| Rule | Why |
|------|-----|
| Never embed `\033_G...\033\\` (APC sequences) in `View.Content` | Cell buffer strips/mangles them |
| Use `tea.Raw()` for all Kitty graphics escape sequences | Bypasses renderer, writes directly to terminal |
| Encode image ID as foreground color on placeholder chars | `\033[38;5;<id>m` for IDs ≤ 255; `\033[38;2;r;g;bm` for larger |
| Use `kitty.Diacritic(row)` and `kitty.Diacritic(col)` as combining chars | Row/column position encoding per Kitty spec |
| Re-transmit on cache hit (detail view re-entry) | Terminal may have evicted image from memory |

### Config

`~/.config/myrecords/config.toml`. Simple line parser (no TOML library). Env var overrides file for each key.

| Config key | Env var override | Required for |
|---|---|---|
| `database_url` | `DATABASE_URL` | always |
| `discogs_username` | `DISCOGS_USERNAME` | sync, collection add |
| `discogs_token` | `DISCOGS_TOKEN` | sync, all Discogs API calls |
| `discogs_user_agent` | `DISCOGS_USER_AGENT` | optional; defaults to `MyRecordCollectionTUI/1.0` |

Discogs credentials are grouped into `discogsConfig{token, userAgent}` and threaded through all Discogs call sites. Never read env vars inside `discogsRequest` — config is injected at `NewModel`.

### TUI add/delete key rules

- `a` — Discogs search add.
- `M` — manual add form (no Discogs).
- `s` — sync collection (two-way Discogs sync from list view).
- Delete is two-step confirm in list view: first `d` arms confirmation, second `d` or `y` executes, `esc`/`n` cancels.

### Manual add form

8 fields in cursor order: Artist \*, Album \*, Year, Label, Catalog #, Genres, Size, Color.

- Artist and Album are required; all others optional.
- Year: validated as integer 1–9999 before `store.Create()`; reject with inline error if not parseable.
- Genres: comma-separated free text; split on `,`, trim each part, skip blanks, store as `[]string`.
- `DataSource` is always `"manual"`.
- Pattern: `activeManualField() *string` switch on `manualCursor` → single backspace/type handler covers all fields.
- `manualFieldCount = 8` constant guards cursor bounds.

### Success feedback pattern

- `successMsg string` field on Model; set after any successful add (Discogs or manual).
- Cleared at the top of the `tea.KeyPressMsg` case in `Update()` — dismissed on next keypress.
- Rendered via `successStyle` (Catppuccin green, bold) above the delete-error line in `renderList()`.
- Do not render `successMsg` as a transient tea.Cmd — it stays until the user acts.

### TUI sync pattern

`s` key in list view → `runSync(store)` cmd → `executeSync()` in `tui/ui/discogs.go` → `syncDoneMsg`.

`syncProgress` struct (internal to `tui/ui`):

```go
type syncProgress struct {
    Phase             string
    Pulled            int
    Pushed            int
    Skipped           int
    Errors            []string
    TotalDiscogsItems int
}
```

State fields on `Model`: `syncing bool`, `syncPhase string`, `syncPulled`, `syncPushed`, `syncSkipped`, `syncTotal int`, `syncErrors []string`.

Rules:

- `syncing = true` on `s` keypress; `false` on `syncDoneMsg`.
- `syncPhase` / `syncErrors` cleared at the top of the `tea.KeyPressMsg` case when `syncPhase == "done"`.
- Progress bar rendered in `renderList()` while `syncing == true`; summary rendered when `syncPhase == "done"`.
- `executeSync()` calls `store.ListDiscogsIDs`, pages `getUserCollection`, calls `store.Create` for new records, `store.MarkSyncedWithDiscogs` in bulk, then `store.ListUnsyncedDiscogsRecords` + `addToDiscogsCollection` for push phase.
- Requires both `discogs_username` and `discogs_token` (config or env); `executeSync` returns error immediately if either is missing.
- `syncDoneMsg` carries the final `syncProgress` struct. `runSync` must not discard it. The `syncDoneMsg` handler applies `Pulled`, `Pushed`, `Skipped`, `TotalDiscogsItems`, and `Errors` to model state so counts and per-record push errors are visible after sync.

### Discogs JSON typing in TUI

- `year` from Discogs can be either JSON number (`1984`) or JSON string (`"1984"`) in search payloads.
- TUI decoder must use a custom unmarshal type (`discogsYear`) that accepts both formats.
- Preserve zero-value behavior: empty string or `null` maps to `0`, then existing `yearPointer`/`yearString` helpers handle display/storage.
- Keep regression tests covering mixed-type `year` payloads in `tui/ui/discogs_test.go`.

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

### db.Store interface

Full method set (all in `tui/db/records.go`):

```go
type Store interface {
    List(ctx context.Context) ([]Record, error)
    Search(ctx context.Context, query string) ([]Record, error)
    Delete(ctx context.Context, id string) error
    Create(ctx context.Context, r Record) error
    ListDiscogsIDs(ctx context.Context) (map[string]struct{}, error)
    MarkSyncedWithDiscogs(ctx context.Context, discogsIDs []string) error
    ListUnsyncedDiscogsRecords(ctx context.Context) ([]Record, error)
}
```

`MarkSyncedWithDiscogs` uses `ANY(ARRAY[$1,$2,...])` — not `IN (...)`. pgx does not support `IN` with a `[]any` variadic slice directly.

Mock all methods in tests. `ListDiscogsIDs` returns `map[string]struct{}` keyed by discogs ID. `MarkSyncedWithDiscogs` and `ListUnsyncedDiscogsRecords` can be no-ops in mocks that don't exercise sync.

### errcheck patterns

`golangci-lint` enforces checked error returns. Common fixes:

```go
defer func() { _ = f.Close() }()       // not: defer f.Close()
defer func() { _ = resp.Body.Close() }()
_, _ = buf.ReadFrom(resp.Body)          // not: buf.ReadFrom(resp.Body)
```

In tests, use helpers that call `t.Fatal` on error:

```go
func writeFile(t *testing.T, path, content string) {
    t.Helper()
    if err := os.WriteFile(path, []byte(content), 0644); err != nil {
        t.Fatal(err)
    }
}
```

Use `t.Setenv("KEY", "")` instead of `os.Unsetenv("KEY")` — auto-restored and errcheck-clean.

## Testing

Run before committing:

```bash
bun run lint          # ESLint
bun run lint:md       # Markdown lint
bun run type-check    # TypeScript
bun run test          # Vitest (196 tests, >90% coverage)
bun run build         # Production build
```

### Go TUI tests

```bash
cd tui/
go test ./... -cover   # All packages with coverage
golangci-lint run      # Lint (includes errcheck, staticcheck, govet, gofmt)
```

### Bounds and overflow guards

- Never slice strings using `s[:len(s)-1]` for user input. Convert to `[]rune` first.
- Cap user-entered field lengths with rune counts (`utf8.RuneCountInString`) before append.
- For numeric IDs from DB/external APIs, parse with `Number.parseInt(..., 10)` and require `Number.isSafeInteger(id) && id > 0` before use.
- In Go tests, avoid prefix checks via slicing (`got[:len(want)]`). Use `strings.HasPrefix` to prevent panics.

`golangci-lint` is the single lint gate. It subsumes `go vet`, `gofmt`, `errcheck`, and `staticcheck`.

| Package | Coverage | Notes |
|---------|----------|-------|
| config | 96% | `configPath` error branch untestable without unsetting `$HOME` |
| db | 44% | Record methods 100%; List/Search/Delete/Create need real DB |
| ui | 98% | Mock store via `db.Store` interface; `httptest` for image fetch |

Use `db.Store` interface (not `*db.RecordStore`) for testability. Mock in tests with struct implementing `List`, `Search`, `Delete`, `Create`, `ListDiscogsIDs`, `MarkSyncedWithDiscogs`, `ListUnsyncedDiscogsRecords`.

### Test isolation

Fresh client per test (`beforeEach`). Shared clients leak rate-limiter state.

### URL-routing mocks

For components that fire multiple fetches: use `mockImplementation` routing by URL, not `mockReturnValueOnce` stacking.

### Query helpers

Use `getByRole("button", { name })`, not `getByTitle`. Use `getAllByText` when text appears on both card faces.

### Non-ASCII in URL tests

Use `encodeURIComponent()` to generate expected strings. Never hardcode percent-encoded values.

### Bun dependency updates

When refreshing dependencies:

```bash
bun update
bun run test
bun run type-check
bun run lint
```

Rules:

- Commit `bun.lock` with every `bun update`
- Keep Bun pinned to an exact version in `package.json` (`engines.bun`, `packageManager`)
- Use `bun install --frozen-lockfile` in CI/deploy builds

## Commit messages

```text
feat: Add vinyl color extraction to search results
fix: Prevent text bleed-through on flip cards
docs: Document flip card animation implementation
```
