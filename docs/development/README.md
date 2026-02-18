# Development Guidelines

Development standards and patterns for the My Record Collection project.

## Getting Started

1. Clone the repository
2. Install dependencies: `bun install`
3. Set up environment variables (see `.env.example`)
4. Run database migrations: `bun run db:push`
5. Start development server: `bun run dev`

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Runtime**: Bun 1.3.9
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL 18 with Drizzle ORM
- **Styling**: Sass (CSS Modules per component + global partials)
- **API Integration**: Discogs API

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

- `bun run dev` - Development server with Turbopack
- `bun run build` - Production build
- `bun run start` - Start production server
- `bun run lint` - Run ESLint (uses `eslint .`, migrated from `next lint` for Next.js 16)
- `bun run type-check` - TypeScript type checking
- `bun run db:generate` - Generate Drizzle migrations
- `bun run db:push` - Push schema changes to database
- `bun run db:studio` - Open Drizzle Studio

## Detailed Guidelines

Individual guideline documents will be added as separate files:

- [x] [Coding standards and patterns](./coding-standards.md)
- [x] [Database schema guidelines](./database-schema.md)
- [x] [API design patterns](./api-design-patterns.md)
- [x] [Testing strategy](../testing.md)

## Design Decisions

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
