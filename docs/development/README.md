# Development Guidelines

Development standards and patterns for the My Record Collection project.

## Getting Started

1. Clone the repository
2. Install dependencies: `bun install`
3. Set up environment variables (see `.env.example`)
4. Run database migrations: `bun run db:push`
5. Start development server: `bun run dev`

## Tech Stack

### Web app

- **Framework**: Next.js 16 (App Router)
- **Runtime**: Bun 1.3.9
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL 18 with Drizzle ORM
- **Styling**: Sass (CSS Modules per component + global partials)
- **API Integration**: Discogs API

### Terminal UI (`tui/`)

- **Language**: Go 1.25+
- **TUI framework**: [Bubble Tea v2](https://github.com/charmbracelet/bubbletea) (`charm.land/bubbletea/v2`)
- **Styling**: [Lip Gloss v2](https://github.com/charmbracelet/lipgloss) (`charm.land/lipgloss/v2`)
- **Database**: Same PostgreSQL, accessed via `jackc/pgx/v5` (no ORM)
- **Image rendering**: kitty / iTerm2 / sixel protocols with mosaic half-block fallback
- **Config**: `~/.config/myrecords/config.toml` (key: `database_url`), `DATABASE_URL` env var override

## Coding Standards

### General Principles

- **Verbose naming**: Descriptive variable and function names
- **Inline comments**: Explain complex logic and rationale
- **Type safety**: Leverage TypeScript fully
- **Non-ASCII support**: Preserve special characters in text

### File Organization

- API routes: `app/api/*/route.ts`
- Components: `components/*/*.tsx`
- Database: `lib/db/schema.ts`
- External APIs: `lib/*/client.ts`

### Component Patterns

- Use `"use client"` for interactive components
- Define Props interfaces above components
- Document component purpose with JSDoc
- Keep components focused and single-purpose

### Database Patterns

- Use `text` type for artist/title fields (non-ASCII preservation)
- UUID primary keys for all tables
- Include vinyl-specific metadata
- Timestamps on all records

### API Patterns

- Rate limiting for external APIs
- Consistent error handling
- Detailed response messages
- Proper HTTP status codes

## Development Workflow

1. **Create issue**: Use beads to track work (`bd create`)
2. **Branch**: Work on feature branches
3. **Code + Docs**: Update documentation with code changes
4. **Test**: Run type checks and linters
5. **Commit**: Follow commit message conventions
6. **Review**: Submit pull request
7. **Close issue**: Mark work complete in beads

## Scripts

### Web app (project root)

- `bun run dev` - Development server with Turbopack
- `bun run build` - Production build
- `bun run start` - Start production server
- `bun run lint` - Run ESLint (uses `eslint .`, migrated from `next lint` for Next.js 16)
- `bun run lint:md` - Run markdownlint-cli2 on all Markdown files
- `bun run type-check` - TypeScript type checking
- `bun run test` - Vitest unit + component tests
- `bun run db:generate` - Generate Drizzle migrations
- `bun run db:push` - Push schema changes to database
- `bun run db:studio` - Open Drizzle Studio

### TUI (`cd tui/`)

- `go build -o records-tui .` - Build the binary
- `go vet ./...` - Static analysis
- `go mod tidy` - Resolve dependencies

## Detailed Guidelines

Individual guideline documents will be added as separate files:

- [x] [Coding standards and patterns](./coding-standards.md)
- [x] [Database schema guidelines](./database-schema.md)
- [x] [API design patterns](./api-design-patterns.md)
- [x] [Testing strategy](../testing.md)

## Design Decisions

### Web app

- **Border radius**: 0px on all elements (sharp, square edges)
- **Package manager**: bun (not npm)
- **Linting**: ESLint CLI (`eslint .`) instead of `next lint` (migrated for Next.js 16 compatibility)
- **Styling**: Sass CSS Modules (`.module.scss` per component) + global partials in `styles/`
- **Color tokens**: CSS custom properties in `styles/_variables.scss` (e.g. `--warm-bg-primary`)
- **Card sizing**: 180px wide (250px flipped), content-driven height (no min-height), 144px album art
- **Font sizes**: `0.75rem` for card titles (front AND back matched), `0.625rem` (10px) for dense metadata
- **Color family**: Warm greens/olives only — no red/blue for errors or buttons
- **Page layout**: `max-width: 80rem` centered container, `var(--warm-bg-secondary)` page background
- **No overflow clipping on grid container**: `overflow-x: clip` clips both axes and truncates flipped cards
- **Search**: Behind collapsible "Add an album" button in header

### TUI

- **Direct pgx, no ORM**: Go `Record` struct maps 1:1 to PostgreSQL columns. Schema is owned by the web app's Drizzle migrations.
- **Config file over .env**: `~/.config/myrecords/config.toml` with a simple line-by-line parser (no external TOML library).
- **Image protocol detection via env vars**: Checks `TERM_PROGRAM`, `TERM`, `KITTY_WINDOW_ID` at startup. No async terminal capability negotiation.
- **Native vs mosaic layout**: Native image protocols (kitty/iTerm2/sixel) render info above the image because `lipgloss.JoinHorizontal` mangles escape sequences. Mosaic renders side-by-side.
