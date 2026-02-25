# Health check

## GET /api/am_i_evil

Returns `200` with `{ "status": "yes_i_am", "message": "Application is running", "timestamp": "..." }`.

Used by Render health check (`render.yaml` → `healthCheckPath: /api/am_i_evil`).

Source: `app/api/am_i_evil/route.ts`
