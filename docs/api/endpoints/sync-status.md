# Sync Status Endpoint

## GET /api/records/sync/status

Checks whether the Discogs sync is configured correctly by verifying that the required environment variables are present.

Used by `app/page.tsx` on mount to decide whether to show the sync configuration warning banner.

### Response (200 OK)

```json
{
  "ready": true,
  "missing": []
}
```

When one or more variables are missing:

```json
{
  "ready": false,
  "missing": ["DISCOGS_USERNAME", "DISCOGS_TOKEN"]
}
```

### Response fields

| Field | Type | Description |
|-------|------|-------------|
| `ready` | `boolean` | `true` if all required env vars are set |
| `missing` | `string[]` | Names of any missing environment variables |

### Required environment variables

| Variable | Purpose |
|----------|---------|
| `DISCOGS_USERNAME` | Discogs account username for collection sync |
| `DISCOGS_TOKEN` | Discogs personal access token for API auth |

### Error responses

This endpoint does not return 4xx/5xx — it always returns 200 with the status payload. Absence of env vars is a configuration state, not an error.

### Example

```bash
curl http://localhost:3000/api/records/sync/status
```

### Notes

- Does **not** make any external API calls — only checks `process.env`
- Safe to call on every page load; no rate limit risk
- If `ready: false`, the sync button will still render but the warning banner will advise the user to configure the missing variables
