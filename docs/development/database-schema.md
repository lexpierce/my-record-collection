# Database schema

Single table: `records`. Defined in `lib/db/schema.ts` (Drizzle ORM).

## `records` table

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `record_id` | UUID | NOT NULL | `gen_random_uuid()` | PK |
| `artist_name` | text | NOT NULL | — | |
| `album_title` | text | NOT NULL | — | |
| `year_released` | integer | YES | — | |
| `label_name` | text | YES | — | |
| `catalog_number` | text | YES | — | |
| `discogs_id` | text | YES | — | UNIQUE |
| `discogs_uri` | text | YES | — | |
| `is_synced_with_discogs` | boolean | NOT NULL | `false` | Display flag only |
| `thumbnail_url` | text | YES | — | 150px |
| `cover_image_url` | text | YES | — | Full-size |
| `genres` | text[] | YES | — | |
| `styles` | text[] | YES | — | |
| `upc_code` | text | YES | — | |
| `record_size` | text | YES | — | e.g. `12"`, `7"` |
| `vinyl_color` | text | YES | — | e.g. `Black`, `Blue Marble` |
| `is_shaped_vinyl` | boolean | YES | `false` | |
| `data_source` | text | NOT NULL | `"discogs"` | `"discogs"` or `"manual"` |
| `created_at` | timestamp | NOT NULL | `now()` | |
| `updated_at` | timestamp | NOT NULL | `now()` | Must set manually on update |

### Indexes

- PK on `record_id`
- UNIQUE on `discogs_id`

### TypeScript types

```ts
import type { Record, NewRecord } from "@/lib/db/schema";
type Record = typeof recordsTable.$inferSelect;
type NewRecord = typeof recordsTable.$inferInsert;
```

## Design notes

- `text` for names (not `varchar`) — preserves non-ASCII (Bjork, Motorhead)
- `discogs_id` as `text` (not integer) — avoids overflow, no casting
- `is_synced_with_discogs` — display flag; sync uses live Discogs contents as source of truth
- Hard delete (no `deleted_at`)
- `updated_at` not auto-updated — queries must include `updatedAt: new Date()` explicitly

## Migrations

Owned by Drizzle Kit. Files in `./drizzle/`.

```bash
bun run db:generate   # Generate migration from schema changes
bun run db:migrate    # Apply pending migrations
bun run db:push       # Push schema directly (dev only)
```

Drizzle tracks migrations in `drizzle.__drizzle_migrations` (**schema `drizzle`**, not `public`).

### Seeding for db:migrate on existing database

If previously managed with `db:push`:

```sql
CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint
);
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('0000_violet_the_order', 1771444094407)
ON CONFLICT DO NOTHING;
```

`hash` and `created_at` must match `drizzle/meta/_journal.json` exactly.

## TUI cross-reference

Go `Record` struct in `tui/db/records.go` maps 1:1 to this table. When
the schema changes via Drizzle migration, the Go struct must be updated
manually.

## Related

- `lib/db/schema.ts` — Drizzle definition
- `lib/db/client.ts` — Connection (`getDatabase()`)
- `tui/db/records.go` — Go struct
- [Vinyl metadata](../features/vinyl-metadata.md)
