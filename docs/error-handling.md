# Error handling

## API routes

All handlers: `try/catch` at top level. Errors logged with `console.error`, returned as:

```json
{ "error": "Short type", "message": "error.message or 'Unknown error'" }
```

Status codes: see [api-design-patterns.md](./development/api-design-patterns.md).

## Discogs client

`makeRequest()` throws with `.status` property on non-2xx:

```ts
const err = new Error(`Discogs API error: ${status} ${statusText}`);
err.status = response.status;
throw err;
```

409 from a Discogs collection write = already in collection, not an error. (Only the TUI writes to Discogs; the web app is read-only.)

## API responses

Unexpected 5xx failures are logged in full server-side via `serverError()` and
return a generic message to the client (`"An internal error occurred..."`), so
internal details (DB messages, stack traces) are never disclosed. The `error`
field still carries the per-endpoint context string.

## Auth (middleware)

State-changing API calls are gated by `src/middleware.ts`: `401` (missing/invalid
bearer token), `403` (cross-origin write), `503` (server missing `APP_AUTH_TOKEN`
— fails closed). The browser clears its stored token on any `401`.

## Sync

Non-fatal errors collected in `progress.errors[]` (string array). Sync runs to completion. Fatal errors (missing `DISCOGS_USERNAME`) throw immediately.

## Database

`getDatabase()` throws at call time (via `getDatabaseUrl()` in `lib/env.ts`) if `DATABASE_URL` is unset or is not a `postgres://`/`postgresql://` connection string. Unique constraint violations in sync counted as skips, not errors. The connection pool is capped (`max`, default 5; override with `DB_POOL_MAX`) so a single instance can't exhaust the managed Postgres connection ceiling.

## Runtime

`/api/records/image` requires `Bun.Image` (Bun runtime). If unavailable it returns `500` with a clear message, and the server logs a one-time startup warning (`lib/runtime.ts`, invoked from `src/middleware.ts`). `/api/health` runs `select 1` and returns `503` when the DB is unreachable.

## Components

Card actions surface inline errors via `showCardError()`. No `window.alert()` for fetch errors.
