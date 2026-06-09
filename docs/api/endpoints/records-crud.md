# Records endpoints

Source: `src/pages/api/records.ts`, `src/pages/api/records/[id].ts`

This app is read-only with respect to Discogs. The local database is a cached
mirror of the Discogs collection, populated by sync (see
[discogs-integration.md](./discogs-integration.md)). There are no endpoints
that create records manually or write back to Discogs.

## GET /api/records

Returns all records. Query params in [api/README.md](../README.md).

Response: `{ "records": [...], "count": N }` (200)

Errors: 500

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
| Local dev/build | Must run through `bun --bun`; Node-style Astro dev lacks `globalThis.Bun.Image` |
| Resize | `.resize(size, size, { fit: "inside", withoutEnlargement: true })` |
| Output | `.webp({ quality: 82 }).blob()` |
| Upstream fetch header | `User-Agent` from `DISCOGS_USER_AGENT`, fallback `MyRecordCollection/1.0` |

Response: `image/webp` (200)

Errors: 400 (invalid `src`), 502

## DELETE /api/records/[id]

Removes a record from the local cache. Does not affect the Discogs collection;
a record still present on Discogs reappears on the next sync.

Response: `{ "message": "Record deleted successfully" }` (200)

Errors: 404, 500
