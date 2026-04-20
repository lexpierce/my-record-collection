# Deployment

Platform: Render. Config: `render.yaml` (Blueprint).

## Services

| Resource | Type | Plan | Region |
|----------|------|------|--------|
| my-record-collection | Web service (Node/Bun) | starter | Oregon |
| my-record-collection-db | PostgreSQL 18 | basic-256mb | Oregon |

## Build pipeline

1. Install Bun (`BUN_VERSION=1.3.13`)
2. `bun install --frozen-lockfile --production && bun run build`
3. Pre-deploy: `bun run db:migrate`
4. Start: `bun run start`

## Build filter

Skips rebuild on changes to `docs/**`, `*.md`, and `tui/**`.

## Environment variables

| Variable | Source | Required |
|----------|--------|----------|
| `NODE_ENV` | `production` | Yes |
| `DATABASE_URL` | Auto from Render DB | Yes |
| `DISCOGS_TOKEN` | Manual (secret) | Yes |
| `DISCOGS_USERNAME` | `Lexpierce` | Yes (for sync) |
| `DISCOGS_USER_AGENT` | `MyRecordCollection/1.0` | No (has default) |
| `BUN_VERSION` | `1.3.13` | Yes |

> **TUI**: also uses `DATABASE_URL`. TUI reads from
> `~/.config/myrecords/config.toml` (`database_url` key) with `DATABASE_URL`
> env override. See [tui/README.md](../../tui/README.md).

## Health check

`/am_i_evil` — static Next.js page, configured in `render.yaml`. See [health-check.md](../api/endpoints/health-check.md).

## Pre-deploy warning

`drizzle-kit migrate` emits `Unrecognized target environment "ES2025"` during the pre-deploy phase. This is cosmetic. `drizzle-kit` uses esbuild internally to parse `drizzle.config.ts`; esbuild reads `tsconfig.json` and does not recognize `ES2025` as a target (highest supported: `ES2024`). Migrations apply successfully. No action required.

## Troubleshooting

| Problem | Check |
|---------|-------|
| Build fails | `bun run type-check`, review build logs |
| Pre-deploy fails | Events tab logs, check `drizzle.__drizzle_migrations` |
| App won't start | Use internal DB URL, verify env vars |
| DB connection fails | Same region, DB status "Available" |
| Discogs API fails | Verify `DISCOGS_TOKEN`, check rate limits |

## Related

- [render.yaml](../../render.yaml)
- [DEPLOYMENT.md](../../DEPLOYMENT.md)
