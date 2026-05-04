# Record shelf

The record shelf is runtime HTML from `renderShelf()` in `src/scripts/record-app.ts`. Pure transformations live in `src/scripts/record-helpers.ts` and `lib/pagination/buckets.ts`.

## Data pipeline

`records` → `filterRecords()` → `sortRecords()` → alpha bucket filter → `paginateRecords()` → `renderRecordCard()`.

## State

| Name | Type | Purpose |
|------|------|---------|
| `records` | `BrowserRecord[]` | All API records |
| `sortBy` | `"artist" \| "title" \| "year"` | Sort key |
| `sortAsc` | `boolean` | Direction |
| `sizeFilter` | `Set<string>` | Active size filters |
| `shapedOnly` | `boolean` | Picture disc only |
| `activeBucket` | `string \| null` | Alpha-nav selection |
| `pageSize` | `25 \| 50 \| 100` | Per page |
| `currentPage` | `number` | 1-indexed |

## Sort logic

- Artist: `artistSortKey()` strips diacritics, leading articles, and leading non-alpha.
- Title: `localeCompare`.
- Year: newest-first by default.

## Filter logic

`effectiveSize(record)` = `record.recordSize || (record.isShapedVinyl ? "Unknown" : '12"')`.

## Alpha nav

Shown when `sortBy === "artist"`. Uses `computeBuckets(records, pageSize)` from `lib/pagination/buckets.ts`.

## Grid CSS

```scss
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 270px);
}
```
