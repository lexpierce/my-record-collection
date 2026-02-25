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

409 from `addToCollection` = already in collection, not an error.

## Sync

Non-fatal errors collected in `progress.errors[]` (string array). Sync runs to completion. Fatal errors (missing `DISCOGS_USERNAME`) throw immediately.

## Database

`getDatabase()` throws at call time if `DATABASE_URL` unset. Unique constraint violations in sync counted as skips, not errors.

## Components

Inline error messages via state (`setErrorMessage`). No `window.alert()` for fetch errors.
