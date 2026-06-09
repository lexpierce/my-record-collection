# Health check

## GET /api/health (readiness)

DB-aware readiness probe. Runs `select 1` against Postgres.

| Field | Value |
|-------|-------|
| Source | `src/pages/api/health.ts` |
| Render config | `render.yaml` → `healthCheckPath: /api/health` |
| 200 | `{ "status": "ok" }` — DB reachable |
| 503 | `{ "status": "degraded" }` — DB query failed |

The service is only marked healthy when its database dependency is reachable.

## GET /am_i_evil (liveness)

Astro page, not an API route. Returns a static HTML page with a green body background and large `YES I AM` text. Useful as a pure liveness check (no DB dependency).

| Field | Value |
|-------|-------|
| Source | `src/pages/am_i_evil.astro` |
| Expected body text | `YES I AM` |

## Related

- [Deployment](../../deployment/README.md)
