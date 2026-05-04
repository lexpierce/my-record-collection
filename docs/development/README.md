# Development reference

## Tech stack

### Web app

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | Astro SSR | `src/pages/` routes and API endpoints |
| Adapter | `@astrojs/node` | Standalone Node server output |
| Runtime | Bun 1.3.13 | Not npm |
| Language | TypeScript strict | `tsconfig.json` extends `astro/tsconfigs/strict` |
| Database | PostgreSQL 18 + Drizzle ORM | `lib/db/schema.ts` |
| Styling | Sass | `src/styles/globals.scss`, `src/styles/record-app.scss`, root token partials |
| Browser UI | Vanilla TypeScript | `src/scripts/record-app.ts`, helpers in `src/scripts/record-helpers.ts` |
| External API | Discogs | `lib/discogs/client.ts` |
| Testing | Vitest + jsdom | See [testing](../testing.md) |

### Terminal UI (`tui/`)

| Layer | Technology | Notes |
|-------|------------|-------|
| Language | Go 1.25+ | Separate module: `tui/go.mod` |
| TUI framework | Bubble Tea v2 | `charm.land/bubbletea/v2` |
| Styling | Lip Gloss v2 | `charm.land/lipgloss/v2` |
| Database | pgx v5 | Same PostgreSQL database |
| Image rendering | kitty / iTerm2 / sixel / mosaic | `tui/ui/image.go` |
| Config | `~/.config/myrecords/config.toml` | `DATABASE_URL` env override |

## Commands

### Web app

```bash
bun run dev           # Astro dev server
bun run build         # Astro production build
bun run start         # Start Astro Node server on 0.0.0.0 from dist/server/entry.mjs
bun run lint          # ESLint scoped to TS files
bun run lint:md       # markdownlint-cli2
bun run type-check    # astro check + tsc --noEmit
bun run test          # Vitest
bun run test:watch    # Vitest watch mode
bun run test:coverage # Vitest with coverage
bun run db:generate   # Drizzle migration generation
bun run db:push       # Push schema to DB (dev only)
bun run db:migrate    # Apply pending migrations
bun run db:studio     # Drizzle Studio GUI
```

### TUI

```bash
cd tui/
go build -o records-tui .
go test ./... -cover
golangci-lint run
go mod tidy
```

## File layout

```text
src/
├── layouts/BaseLayout.astro
├── pages/
│   ├── index.astro
│   ├── am_i_evil.astro
│   └── api/**/*.ts
├── scripts/
│   ├── record-app.ts
│   └── record-helpers.ts
└── styles/
    ├── globals.scss
    └── record-app.scss

styles/
├── _variables.scss
├── _reset.scss
└── _animations.scss

lib/
├── db/schema.ts + client.ts
├── discogs/client.ts + sync.ts
└── pagination/buckets.ts
```

## Web app rules

| Decision | Rule |
|----------|------|
| Border radius | `0` everywhere except spinner circles |
| Package manager | Bun, never npm |
| Styling | Sass only, no Tailwind |
| Color tokens | Semantic CSS custom properties from `styles/_variables.scss` |
| Card size | 270px wide, 375px flipped, content-driven height |
| Page layout | `max-width: 80rem` header/search, full-width grid |
| Grid | `grid-template-columns: repeat(auto-fill, 270px)` |
| Overflow | No `overflow-x: clip` on grid ancestors |

## Related

- [Coding standards](./coding-standards.md)
- [TypeScript configuration](./typescript.md)
- [Database schema](./database-schema.md)
- [API design patterns](./api-design-patterns.md)
- [Testing](../testing.md)
