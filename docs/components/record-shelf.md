# RecordShelf

Source: `components/records/RecordShelf.tsx` + `RecordShelf.module.scss`

Client component. Main record browsing grid.

## Props

| Prop | Type | Default |
|------|------|---------|
| `refreshKey` | `number` | `0` — increment to re-fetch |

## Data pipeline

`records` → filter (size, shaped) → sort → alpha bucket filter → page slice → render

## State

| Name | Type | Purpose |
|------|------|---------|
| `records` | `Record[]` | All from API |
| `sortBy` | `"artist" \| "title" \| "year"` | Sort key |
| `sortAsc` | `boolean` | Direction |
| `sizeFilter` | `Set<string>` | Active size filters |
| `shapedOnly` | `boolean` | Picture disc only |
| `activeBucket` | `string \| null` | Alpha-nav selection |
| `pageSize` | `25 \| 50 \| 100` | Per page (initial: 50 desktop, 25 mobile) |
| `currentPage` | `number` | 1-indexed |

## Sort logic

- **Artist**: `artistSortKey()` strips diacritics, removes leading "The "/"A ", strips leading non-alpha. Secondary: year asc (no year = 9999).
- **Title**: `localeCompare`
- **Year**: desc by default (no year = 0)

## Filter logic

`effectiveSize(r)` = `r.recordSize || (r.isShapedVinyl ? "Unknown" : '12"')`. Size options derived from actual records.

## Alpha-nav

Shown when `sortBy === "artist"`. Uses `computeBuckets(records, pageSize)` from `lib/pagination/buckets.ts`.

## Grid CSS

```scss
.grid { display: grid; grid-template-columns: repeat(auto-fill, 180px); gap: 1rem; }
```

No breakpoints. Auto-reflow.

## Files

- `components/records/AlphaNav.tsx` + `.module.scss`
- `lib/pagination/buckets.ts` — `computeBuckets()`, `artistSortKey()`
