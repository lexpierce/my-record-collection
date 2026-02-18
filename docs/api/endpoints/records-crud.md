# Records CRUD endpoints

CRUD operations for the local record collection.

## GET /api/records

Fetches all records from the database. All query parameters are optional; without them the response returns all records sorted newest-first.

### Query parameters

| Parameter | Values | Default | Notes |
|---|---|---|---|
| `sortBy` | `artist` \| `title` \| `year` \| `createdAt` | `createdAt` | Column to sort by |
| `sortDir` | `asc` \| `desc` | `desc` for `createdAt`/`year`; `asc` otherwise | Sort direction |
| `size` | e.g. `12"`, `7"` | — | Filter by `record_size`; repeat for multiple values |
| `shaped` | `true` | — | Filter to shaped/picture-disc records only |

### Response (200 OK)

```json
{
  "records": [ { ...record }, ... ],
  "count": 42
}
```

### Error responses

- `500 Internal Server Error` — database failure

### Example

```bash
curl "http://localhost:3000/api/records?sortBy=artist&sortDir=asc&size=12%22&size=7%22"
```

### Notes

- The `size` filter matches the `record_size` column exactly. Records with a null `record_size` are excluded when a size filter is active.
- Alphabetical pagination is computed client-side by `computeBuckets()` in `lib/pagination/buckets.ts`.

---

## POST /api/records

Adds a new record to the collection manually (without Discogs).

### Request body

| Field | Type | Required | Description |
|---|---|---|---|
| `artistName` | string | Yes | Artist or band name |
| `albumTitle` | string | Yes | Album title |
| `yearReleased` | integer | No | Year of release |
| (any other schema field) | — | No | Any nullable column from the schema |

### Response (201 Created)

```json
{
  "record": { ...record },
  "message": "Record added successfully"
}
```

### Error responses

- `400 Bad Request` — `artistName` or `albumTitle` missing
- `500 Internal Server Error` — database failure

### Example

```bash
curl -X POST http://localhost:3000/api/records \
  -H "Content-Type: application/json" \
  -d '{"artistName": "Kraftwerk", "albumTitle": "Autobahn", "yearReleased": 1974}'
```

---

## GET /api/records/[id]

Fetches a single record by its UUID.

### Path parameter

| Parameter | Type | Description |
|---|---|---|
| `id` | UUID string | The `record_id` of the record |

### Response (200 OK)

```json
{
  "record": { ...record }
}
```

### Error responses

- `404 Not Found` — no record with that ID
- `500 Internal Server Error` — database failure

### Example

```bash
curl http://localhost:3000/api/records/550e8400-e29b-41d4-a716-446655440000
```

---

## PUT /api/records/[id]

Updates an existing record. Accepts any subset of record fields; merges with existing data.

### Path parameter

| Parameter | Type | Description |
|---|---|---|
| `id` | UUID string | The `record_id` of the record to update |

### Request body

Any combination of record fields to update. `updatedAt` is set automatically.

```json
{
  "yearReleased": 1975,
  "labelName": "Capitol"
}
```

### Response (200 OK)

```json
{
  "record": { ...updatedRecord },
  "message": "Record updated successfully"
}
```

### Error responses

- `404 Not Found` — no record with that ID
- `500 Internal Server Error` — database failure

### Example

```bash
curl -X PUT http://localhost:3000/api/records/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{"yearReleased": 1975}'
```

---

## DELETE /api/records/[id]

Permanently removes a record from the collection. No soft-delete — this is irreversible.

### Path parameter

| Parameter | Type | Description |
|---|---|---|
| `id` | UUID string | The `record_id` of the record to delete |

### Response (200 OK)

```json
{
  "message": "Record deleted successfully"
}
```

### Error responses

- `404 Not Found` — no record with that ID
- `500 Internal Server Error` — database failure

### Example

```bash
curl -X DELETE http://localhost:3000/api/records/550e8400-e29b-41d4-a716-446655440000
```

### Notes

- Hard delete — no `deleted_at` column or recovery mechanism.
- The `RecordCard` component triggers this via the inline "Are you sure?" confirmation UI (no `window.confirm()`).

---

## Related

- [API overview](../README.md)
- [Database schema](../../development/database-schema.md)
- [RecordCard component](../../components/record-card.md)
