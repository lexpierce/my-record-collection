# Database Schema

The application uses a single PostgreSQL table: `records`.

## Table: `records`

Defined in `lib/db/schema.ts` using Drizzle ORM.

### Columns

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `record_id` | UUID | NOT NULL | `gen_random_uuid()` | Primary key |
| `artist_name` | text | NOT NULL | — | `text` preserves non-ASCII (Björk, Motörhead) |
| `album_title` | text | NOT NULL | — | `text` preserves non-ASCII |
| `year_released` | integer | nullable | — | |
| `label_name` | text | nullable | — | |
| `catalog_number` | text | nullable | — | |
| `discogs_id` | text | nullable | — | UNIQUE constraint |
| `discogs_uri` | text | nullable | — | Resource URL on discogs.com |
| `is_synced_with_discogs` | boolean | NOT NULL | `false` | True when record exists in Discogs collection |
| `thumbnail_url` | text | nullable | — | 150px thumbnail from Discogs |
| `cover_image_url` | text | nullable | — | Full-size cover image from Discogs |
| `genres` | text[] | nullable | — | Array, e.g. `["Rock", "Electronic"]` |
| `styles` | text[] | nullable | — | Array, e.g. `["Grunge", "Alternative Rock"]` |
| `upc_code` | text | nullable | — | EAN/UPC barcode |
| `record_size` | text | nullable | — | e.g. `12"`, `7"`, `10"` |
| `vinyl_color` | text | nullable | — | e.g. `"Black"`, `"Blue Marble"` |
| `is_shaped_vinyl` | boolean | nullable | `false` | True for picture discs, die-cut shapes |
| `data_source` | text | NOT NULL | `"discogs"` | `"discogs"` or `"manual"` |
| `created_at` | timestamp | NOT NULL | `now()` | Row creation time |
| `updated_at` | timestamp | NOT NULL | `now()` | Last update time (must be set manually on update) |

### TypeScript Types

```ts
import type { Record, NewRecord } from "@/lib/db/schema";

// Full row from the database (all columns present)
type Record = typeof recordsTable.$inferSelect;

// Insert shape (required fields only; optionals are nullable columns)
type NewRecord = typeof recordsTable.$inferInsert;
```

### Indexes

- Primary key on `record_id`
- Unique index on `discogs_id` (prevents duplicate Discogs releases)

## Design Decisions

### `text` for artist/album fields

Postgres `varchar` is identical to `text` internally, but `text` makes the intent clearer: no length limit, no charset issues. Artist names with diacritics (`Björk`, `Sigur Rós`) and non-Latin scripts are stored without transformation.

### `discogs_id` as `text` (not integer)

Discogs release IDs are integers in the API but stored as text. This avoids integer overflow for very large IDs and keeps join logic simple (no casting).

### `is_synced_with_discogs`

Set to `true` when the record is confirmed to exist in the user's Discogs collection. The sync process (`lib/discogs/sync.ts`) uses the _live_ Discogs collection contents as the source of truth — not this flag — to determine what to push. The flag is kept for UI display ("✓ Synced").

### No soft-delete

Records are hard-deleted via `DELETE /api/records/[id]`. There is no `deleted_at` column. If you want an audit trail, add one.

### `updated_at` not auto-updated

Postgres does not have an `ON UPDATE` equivalent for timestamps the way MySQL does. All update queries must explicitly include `updatedAt: new Date()` in the `set()` call. This is enforced by convention, not the schema.

## Migration

The schema is managed by Drizzle Kit.

```bash
# Generate migration files from schema changes
bun run db:generate

# Apply pending migrations
bun run db:migrate

# Danger: push schema directly without migrations (dev only)
bun run db:push
```

Migration files are written to `./drizzle/`. The `drizzle.config.ts` file points to `lib/db/schema.ts`.

## Related

- `lib/db/schema.ts` — Drizzle schema definition
- `lib/db/client.ts` — Database connection
- `lib/discogs/sync.ts` — Sync logic that reads/writes this table
- [Vinyl Metadata](../features/vinyl-metadata.md)
