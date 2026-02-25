# Vinyl metadata extraction

Source: `lib/discogs/client.ts`

Three fields extracted from Discogs `formats` array. All look for `format.name === "Vinyl"` first.

## Fields

| DB column | Extractor | Logic |
|-----------|-----------|-------|
| `record_size` | `extractRecordSize(formats)` | Match `"`, `inch`, `7`, `10`, `12` in descriptions |
| `vinyl_color` | `extractVinylColor(formats)` | Match color keywords in descriptions, fallback to `text` field |
| `is_shaped_vinyl` | `isShapedVinyl(formats)` | Match `Picture Disc`, `Shaped`, `Shape`, `Picture` |

## Color keywords

`Vinyl`, `Colored`, `Clear`, `Transparent`, `Marble`, `Splatter`, `Black`, `White`, `Red`, `Blue`, `Green`, `Yellow`, `Purple`, `Pink`, `Orange`, `Grey`

## Edge cases

- No `formats` → all null/false
- `format.name !== "Vinyl"` → all null/false
- Multiple vinyl formats → extracts from first match
- Unicode in descriptions (e.g. `33 ⅓ RPM`) → preserved via `text` type

## Data flow

1. Search: `GET /api/records/search` → `getRelease()` per result → extract → enrich response
2. Add: `POST /api/records/fetch-from-discogs` → `getRelease()` → extract → insert row
3. Update: `POST /api/records/update-from-discogs` → `getRelease()` → extract → update row
4. Sync: `executeSync()` → `collectionReleaseToRecord()` → extract → insert row
