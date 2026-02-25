# API endpoint reference

Base URL: `http://localhost:3000/api` (dev), `https://<app>.onrender.com/api` (prod).

No authentication. All endpoints public.

## Endpoints

| Method | Path | Purpose | Docs |
|--------|------|---------|------|
| GET | `/api/am_i_evil` | Health check | [health-check.md](./endpoints/health-check.md) |
| GET | `/api/records` | List records | [records-crud.md](./endpoints/records-crud.md) |
| POST | `/api/records` | Create record manually | [records-crud.md](./endpoints/records-crud.md) |
| GET | `/api/records/[id]` | Get single record | [records-crud.md](./endpoints/records-crud.md) |
| PUT | `/api/records/[id]` | Update record | [records-crud.md](./endpoints/records-crud.md) |
| DELETE | `/api/records/[id]` | Delete record | [records-crud.md](./endpoints/records-crud.md) |
| GET | `/api/records/search` | Search Discogs | [discogs-integration.md](./endpoints/discogs-integration.md) |
| POST | `/api/records/fetch-from-discogs` | Fetch + save from Discogs | [discogs-integration.md](./endpoints/discogs-integration.md) |
| POST | `/api/records/update-from-discogs` | Refresh from Discogs | [discogs-integration.md](./endpoints/discogs-integration.md) |
| POST | `/api/records/sync` | Full sync (SSE) | [discogs-integration.md](./endpoints/discogs-integration.md) |
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
