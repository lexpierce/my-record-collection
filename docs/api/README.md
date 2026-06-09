# API endpoint reference

Base URL: `http://localhost:3000/api` (dev), `https://<app>.onrender.com/api` (prod).

## Authentication

`GET` endpoints are public (read-only browsing). All state-changing methods
(`POST`, `DELETE`) require a shared secret via Astro middleware (`src/middleware.ts`):

- Header: `Authorization: Bearer <APP_AUTH_TOKEN>`
- Missing/wrong token → `401`; cross-origin write → `403`; `APP_AUTH_TOKEN` unset on the server → `503` (fails closed).

The browser UI prompts for the token once per session (held in `sessionStorage`, never embedded in the page HTML).

## Endpoints

| Method | Path | Purpose | Docs |
|--------|------|---------|------|
| GET | `/api/health` | DB-aware readiness probe | [health-check.md](./endpoints/health-check.md) |
| GET | `/am_i_evil` | Liveness check (static) | [health-check.md](./endpoints/health-check.md) |
| GET | `/api/records` | List records | [records-crud.md](./endpoints/records-crud.md) |
| GET | `/api/records/[id]` | Get single record | [records-crud.md](./endpoints/records-crud.md) |
| GET | `/api/records/image` | Resize and convert artwork with `Bun.Image` | [records-crud.md](./endpoints/records-crud.md) |
| DELETE | `/api/records/[id]` | Remove record from local cache | [records-crud.md](./endpoints/records-crud.md) |
| POST | `/api/records/update-from-discogs` | Refresh one cached record from Discogs | [discogs-integration.md](./endpoints/discogs-integration.md) |
| POST | `/api/records/sync` | Pull collection into cache (SSE) | [discogs-integration.md](./endpoints/discogs-integration.md) |
| GET | `/api/records/sync/status` | Check env var config | [sync-status.md](./endpoints/sync-status.md) |

## GET /api/records query params

| Param | Values | Default | Notes |
|-------|--------|---------|-------|
| `sortBy` | `artist` `title` `year` `createdAt` | `createdAt` | |
| `sortDir` | `asc` `desc` | `desc` for `createdAt`/`year`, `asc` otherwise | |
| `size` | e.g. `12"`, `7"` | — | Repeatable. Null `record_size` excluded when active. |
| `shaped` | `true` | — | Shaped/picture disc only |

## Response format

```json
{ "record": { ... }, "message": "..." }
{ "records": [...], "count": N }
{ "error": "Type", "message": "Detail" }
```

## Discogs rate limits

Authenticated: 60 req/min. Unauthenticated: 25 req/min. Token bucket in `DiscogsClient`.

## Related

- [Discogs client](./discogs-client.md)
- [API design patterns](../development/api-design-patterns.md)
