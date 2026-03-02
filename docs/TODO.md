# TODO

Tracked work items.

## High priority

None.

## Medium priority

None.

## Low priority

None.

## Completed (this session)

- [x] TUI list view: added delete flow with two-step confirmation (`d` then `d`/`y`, cancel with `esc`/`n`)
- [x] TUI add flow: removed manual form; Discogs search is now the only add path
- [x] TUI Discogs add supports artist+album, catalog number, and UPC search modes
- [x] TUI store insert updated to persist Discogs metadata fields (`catalog_number`, `discogs_id`, artwork URLs, UPC, format metadata, sync flag)
- [x] Updated TUI docs/tests for Discogs-only add and delete behavior

## Completed (previous sessions)

- [x] Fixed Kitty image flash-and-disappear: switched to Unicode virtual placements (`tui/ui/image.go`, `tui/ui/model.go`)
- [x] Documented Kitty virtual placement pattern in `docs/development/coding-standards.md`
- [x] Updated `tui/README.md` album art section for virtual placements

- [x] Fixed Kitty graphics rendering: added `ImageWidth`/`ImageHeight` to `renderKitty` options (`tui/ui/image.go`)
- [x] Added `xterm-ghostty` TERM detection for Ghostty inside tmux/screen
- [x] Documented Kitty graphics protocol pitfalls (RGBA requires explicit dimensions) in coding-standards.md

- [x] Rewrote all 25 docs for agent-first consumption (tables, flat facts, no prose)
- [x] Added `tui/**` to `render.yaml` `buildFilter.ignoredPaths`
- [x] Fixed missing `go.sum` entry for `charmbracelet/x/ansi/sixel`
- [x] Documented `go.sum` maintenance gotcha in coding-standards.md
- [x] Go TUI: test suite — config 96%, db 44%, ui 98% coverage
- [x] Go TUI: `db.Store` interface extracted for testability
- [x] Go TUI: `golangci-lint` as single lint gate (replaces `gofmt` + `go vet`)
- [x] Go TUI: fixed 12 errcheck/staticcheck issues across source and tests
- [x] Go TUI: native image protocol support (kitty/iTerm2/sixel/mosaic)
- [x] Go TUI: config file at `~/.config/myrecords/config.toml`
- [x] Go TUI: `db.Connect()` accepts URL parameter
- [x] TUI README documents config, keybindings, image protocol detection
- [x] BubbleTea v2 / Lipgloss v2 gotchas documented in coding-standards.md
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
