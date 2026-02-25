# Sync status

## GET /api/records/sync/status

Checks `process.env` for required Discogs env vars. No external API calls.

Response (always 200):

```json
{ "ready": true, "missing": [] }
{ "ready": false, "missing": ["DISCOGS_USERNAME", "DISCOGS_TOKEN"] }
```

Required vars: `DISCOGS_USERNAME`, `DISCOGS_TOKEN`.

Drives the warning banner in `app/page.tsx`.

Source: `app/api/records/sync/status/route.ts`
