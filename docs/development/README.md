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
- **Styling**: Tailwind CSS v4
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
- [ ] Database schema guidelines
- [ ] API design patterns
- [ ] Testing strategy

## Design Decisions

- **Border radius**: 0px on all elements (sharp, square edges)
- **Package manager**: bun (not npm)
- **Linting**: ESLint CLI (`eslint .`) instead of `next lint` (migrated for Next.js 16 compatibility)
- **Tailwind CSS v4**: Uses `@import "tailwindcss"` + `@config` in CSS (NOT v3 `@tailwind` directives)
- **Card sizing**: 180px wide, content-driven height (no min-height), 144px album art
- **Font sizes**: `text-[11px]` for card titles (front AND back matched), `text-[10px]` for dense metadata
- **Color family**: Warm browns/bronzes only — no red/blue for errors or buttons
- **Page layout**: `max-w-7xl` centered container, `bg-warmBg-secondary` page background
- **Search**: Behind collapsible "Add an album" button in header
