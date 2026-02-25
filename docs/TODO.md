# TODO

Tracked work items.

## High priority

None.

## Medium priority

None.

## Low priority

None.

## Completed (this session)

- [x] Rewrote all 25 docs for agent-first consumption (tables, flat facts, no prose)
- [x] Added `tui/**` to `render.yaml` `buildFilter.ignoredPaths`
- [x] Fixed missing `go.sum` entry for `charmbracelet/x/ansi/sixel`
- [x] Documented `go.sum` maintenance gotcha in coding-standards.md
- [x] Go TUI: native image protocol support (kitty/iTerm2/sixel/mosaic)
- [x] Go TUI: config file at `~/.config/myrecords/config.toml`
- [x] Go TUI: `db.Connect()` accepts URL parameter
- [x] TUI README documents config, keybindings, image protocol detection
- [x] BubbleTea v2 / Lipgloss v2 gotchas documented in coding-standards.md

## Completed (previous sessions)

- [x] Removed `max-width: 80rem` from `.shelfSection`
- [x] Responsive initial page size (50 desktop, 25 mobile)
- [x] Removed redundant `paths: ["**"]` from `render.yaml` buildFilter
- [x] `RecordCard` — inline confirmation UI, no `window.confirm`/`window.alert`
- [x] `SearchBar` — fixed `setTimeout` leak
- [x] `RecordCard` — `discogsUri` as clickable link
- [x] `sync.ts` — eliminated N+1 `DiscogsClient` instances
- [x] Alphabetical pagination with two-pass bucket algorithm
- [x] Accessibility: `role=button`, `tabIndex`, `aria-expanded`, keyboard handlers
- [x] Fixed `RecordCard` update/delete — `onRecordMutated` callback pattern
- [x] Fixed `lib/db/client.ts` — lazy `getDatabase()` getter
- [x] Set up Vitest + RTL with 195 tests, >90% coverage
- [x] All source files commented
- [x] Drizzle migration seeding documented
