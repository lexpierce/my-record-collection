# API Documentation

The My Record Collection API provides REST endpoints for managing vinyl records and integrating with the Discogs API.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-app.onrender.com/api`

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible.

## API Endpoints

### Health Check
- `GET /api/am_i_evil` - Health check endpoint

### Records
- `GET /api/records` - Fetch records; optional query params: `sortBy`, `sortDir`, `size`, `shaped`
- `POST /api/records` - Add a record manually (future feature)
- `GET /api/records/[recordId]` - Fetch a single record by ID
- `PUT /api/records/[recordId]` - Update a record
- `DELETE /api/records/[recordId]` - Delete a record from the collection

### Discogs Integration
- `GET /api/records/search` - Search for records on Discogs
- `POST /api/records/fetch-from-discogs` - Fetch and save a record from Discogs
- `POST /api/records/update-from-discogs` - Update an existing record with latest Discogs data
- `POST /api/records/sync` - Sync full Discogs collection to local database

### Configuration
- `GET /api/records/sync/status` - Check if Discogs env vars are configured

## Response Format

All API responses follow a consistent JSON format:

**Success Response:**
```json
{
  "data": { ... },
  "message": "Success message"
}
```

**Error Response:**
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

## GET /api/records Query Parameters

All parameters are optional. Without them the response is identical to the previous behaviour (all records, newest-first).

| Parameter | Values | Default | Notes |
|---|---|---|---|
| `sortBy` | `artist` \| `title` \| `year` \| `createdAt` | `createdAt` | Column to sort by |
| `sortDir` | `asc` \| `desc` | `desc` for `createdAt`/`year`; `asc` otherwise | Sort direction |
| `size` | e.g. `12"`, `7"` | — | Filter by `record_size`; repeat for multiple values |
| `shaped` | `true` | — | Filter to shaped/picture-disc records only |

Example:
```
GET /api/records?sortBy=artist&sortDir=asc&size=12%22&size=7%22
```

Note: the `size` filter matches the `record_size` column exactly. Records with a null `record_size` are excluded when a size filter is active (client-side `effectiveSize` defaulting is **not** applied server-side).

## Rate Limiting

### Discogs API Limits
- **Authenticated**: 60 requests per minute
- **Unauthenticated**: 25 requests per minute

The application automatically handles rate limiting internally using a token bucket algorithm.

## Detailed Endpoint Documentation

Detailed documentation for each endpoint will be added in `./endpoints/`:

- [x] Health check endpoint — `./endpoints/health-check.md`
- [x] Sync status — `./endpoints/sync-status.md`
- [x] Records CRUD operations — `./endpoints/records-crud.md`
- [x] Discogs search and integration — `./endpoints/discogs-integration.md`

## Common Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Examples

See individual endpoint documentation in the `./endpoints/` directory for curl examples and detailed usage.
