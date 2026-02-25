# Development reference

## Tech stack

### Web app

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16 (App Router) | `app/` directory |
| Runtime | Bun 1.3.9 | Not npm |
| Language | TypeScript (strict) | `tsconfig.json` |
| Database | PostgreSQL 18 + Drizzle ORM | `lib/db/schema.ts` |
| Styling | Sass CSS Modules | `.module.scss` per component + `styles/globals.scss` |
| External API | Discogs | `lib/discogs/client.ts` |
| Testing | Vitest + React Testing Library | See [testing.md](../testing.md) |

### Terminal UI (`tui/`)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Language | Go 1.25+ | Separate module: `tui/go.mod` |
| TUI framework | Bubble Tea v2 | `charm.land/bubbletea/v2` |
| Styling | Lip Gloss v2 | `charm.land/lipgloss/v2` |
| Database | pgx v5 (no ORM) | `jackc/pgx/v5`, same PostgreSQL |
| Image rendering | kitty / iTerm2 / sixel / mosaic | `tui/ui/image.go` |
| Config | `~/.config/myrecords/config.toml` | `database_url` key, `DATABASE_URL` env override |

## Commands

### Web app (project root)

```bash
bun run dev           # Dev server (Turbopack)
bun run build         # Production build
bun run start         # Start production server
bun run lint          # ESLint (eslint .)
bun run lint:md       # markdownlint-cli2
bun run type-check    # tsc --noEmit
bun run test          # Vitest
bun run test:watch    # Vitest watch mode
bun run test:coverage # Vitest with coverage
bun run db:generate   # Drizzle migration generation
bun run db:push       # Push schema to DB (dev only)
bun run db:migrate    # Apply pending migrations
bun run db:studio     # Drizzle Studio GUI
```

### TUI (`cd tui/`)

```bash
go build -o records-tui .   # Build binary
go vet ./...                # Static analysis
go mod tidy                 # Resolve deps
```

## File layout

```text
app/
├── api/*/route.ts          # API routes
├── layout.tsx              # Root layout
├── page.tsx                # Main page (client component)
└── page.module.scss

components/records/
├── RecordCard.tsx + .module.scss
├── RecordShelf.tsx + .module.scss
├── AlphaNav.tsx + .module.scss
└── SearchBar.tsx + .module.scss

styles/
├── _variables.scss         # CSS custom properties
├── _reset.scss             # Base reset
├── _animations.scss        # @keyframes
└── globals.scss            # Imports partials + global classes

lib/
├── db/schema.ts + client.ts
├── discogs/client.ts + sync.ts
└── pagination/buckets.ts

tui/                        # Separate Go module
├── config/config.go
├── db/connect.go + records.go
└── ui/model.go + styles.go + image.go
```

## Design decisions

### Web app

| Decision | Rule |
|----------|------|
| Border radius | `0` everywhere (sharp edges) |
| Package manager | bun, never npm |
| Linter | `eslint .` (not `next lint`) |
| Styling | Sass CSS Modules only, no Tailwind |
| Color tokens | CSS custom properties in `styles/_variables.scss` |
| Card size | 180px wide (250px flipped), content-driven height, 144px album art |
| Font sizes | `0.75rem` card titles, `0.625rem` dense metadata |
| Color family | Warm greens/olives only, no red/blue |
| Page layout | `max-width: 80rem` header/search, full-width grid |
| Overflow | No `overflow-x: clip` on grid ancestors |

### TUI

| Decision | Rule |
|----------|------|
| ORM | None. `Record` struct maps 1:1 to PostgreSQL columns. |
| Config | `~/.config/myrecords/config.toml`, custom line parser, no TOML library |
| Image detection | Env vars at startup (`TERM_PROGRAM`, `TERM`, `KITTY_WINDOW_ID`) |
| Native image layout | Info above image (not side-by-side) — `JoinHorizontal` mangles escape sequences |
| Mosaic layout | Side-by-side (half-block chars are plain text) |

## Related

- [Coding standards](./coding-standards.md)
- [Database schema](./database-schema.md)
- [API design patterns](./api-design-patterns.md)
- [Testing](../testing.md)
