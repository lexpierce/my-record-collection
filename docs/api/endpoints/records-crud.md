# Records CRUD endpoints

Source: `app/api/records/route.ts`, `app/api/records/[id]/route.ts`

## GET /api/records

Returns all records. Query params in [api/README.md](../README.md).

Response: `{ "records": [...], "count": N }` (200)

Errors: 500

## POST /api/records

Creates a record manually (no Discogs).

Body: `{ "artistName": string, "albumTitle": string, "yearReleased"?: number, ... }`

Required: `artistName`, `albumTitle`. All other schema fields optional.

Response: `{ "record": {...}, "message": "..." }` (201)

Errors: 400 (missing fields), 500

## GET /api/records/[id]

Path param: UUID `record_id`.

Response: `{ "record": {...} }` (200)

Errors: 404, 500

## GET /api/records/image

Fetches remote Discogs artwork and uses `Bun.Image` to resize to WebP.

| Param | Rule |
|-------|------|
| `src` | Required absolute `http`/`https` URL on `discogs.com` or `*.discogs.com` |
| `size` | Optional integer pixel size; default `324`, min `1`, max `1200` |

| Runtime rule | Value |
|--------------|-------|
| `Bun.Image` input | `Blob` from `sourceResponse.blob()`; do not pass `Response` |
| Resize | `.resize(size, size, { fit: "inside", withoutEnlargement: true })` |
| Output | `.webp({ quality: 82 }).blob()` |
| Upstream fetch header | `User-Agent` from `DISCOGS_USER_AGENT`, fallback `MyRecordCollection/1.0` |

Response: `image/webp` (200)

Errors: 400 (invalid `src`), 502

## PUT /api/records/[id]

Partial update. Any subset of record fields. `updatedAt` set automatically.

Response: `{ "record": {...}, "message": "..." }` (200)

Errors: 404, 500

## DELETE /api/records/[id]

Hard delete. Irreversible.

Response: `{ "message": "Record deleted successfully" }` (200)

Errors: 404, 500
