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
- `GET /api/records` - Fetch all records from the collection
- `POST /api/records` - Add a record manually (future feature)
- `DELETE /api/records/[recordId]` - Delete a record from the collection

### Discogs Integration
- `GET /api/records/search` - Search for records on Discogs
- `POST /api/records/fetch-from-discogs` - Fetch and save a record from Discogs
- `POST /api/records/update-from-discogs` - Update an existing record with latest Discogs data

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

## Rate Limiting

### Discogs API Limits
- **Authenticated**: 60 requests per minute
- **Unauthenticated**: 25 requests per minute

The application automatically handles rate limiting internally using a token bucket algorithm.

## Detailed Endpoint Documentation

Detailed documentation for each endpoint will be added in `./endpoints/`:

- [ ] Health check endpoint
- [ ] Records CRUD operations
- [ ] Discogs search and integration

## Common Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Examples

See individual endpoint documentation in the `./endpoints/` directory for curl examples and detailed usage.
