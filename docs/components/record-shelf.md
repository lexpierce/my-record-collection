# RecordShelf Component

The main record browsing grid. Fetches and displays all records, with sorting, filtering, and alphabetical navigation.

## Overview

`RecordShelf` is a client component (`"use client"`) that:

1. Fetches all records from `GET /api/records` on mount.
2. Re-fetches whenever `refreshKey` increments (parent bumps it after sync or add).
3. Sorts records client-side by artist, title, or year.
4. Filters records client-side by vinyl size and/or shaped status.
5. When sorted by artist, renders an `AlphaNav` bar of letter-bucket buttons that further filters the grid to the selected bucket.

```tsx
import RecordShelf from "@/components/records/RecordShelf";

// Basic usage
<RecordShelf />

// With refresh trigger
<RecordShelf refreshKey={refreshKey} />
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `refreshKey` | `number` | `0` | Increment this to trigger a re-fetch without reloading the page |

## State

| Name | Type | Purpose |
|---|---|---|
| `records` | `Record[]` | All records from the API |
| `isLoading` | `boolean` | True while the initial fetch is in flight |
| `errorMessage` | `string` | Set when the fetch fails |
| `sortBy` | `"artist" \| "title" \| "year"` | Currently selected sort key |
| `sortAsc` | `boolean` | True = ascending, false = descending |
| `showFilters` | `boolean` | Whether the filter dropdown is open |
| `sizeFilter` | `Set<string>` | Active size filters (e.g. `{"12\""}`) |
| `shapedOnly` | `boolean` | When true, only shaped/picture disc records are shown |
| `activeBucket` | `string \| null` | Active alpha-nav bucket label, or `null` for "All" |

## Sort Logic

### Artist sort

Artist names are normalised before comparison:

1. Diacritics stripped via `String.normalize("NFD")` (e.g. `Björk` → `Bjork`).
2. Leading articles removed: `"The "` and `"A "` (case-insensitive).
3. Leading non-alphanumeric characters removed.

Secondary sort: year ascending (records with no year sort last at 9999).

### Title sort

Simple `localeCompare` on `albumTitle`.

### Year sort

Descending by default (newest first). Records with no year sort last (treated as year 0).

## Filter Logic

### Size filter

The `effectiveSize` helper determines a record's display size:

```ts
const effectiveSize = (r: Record) =>
  r.recordSize || (r.isShapedVinyl ? "Unknown" : '12"');
```

If a record has no explicit `recordSize`:
- Defaults to `12"` (by far the most common format).
- Defaults to `"Unknown"` if it is a shaped vinyl (size ambiguous).

The size filter options are derived dynamically from the actual records in the collection, so only sizes that exist are shown.

### Shaped filter

When `shapedOnly` is true, only records with `isShapedVinyl === true` are shown.

### Filter badge

The filter button shows a badge with the count of active filter groups:
- Size filter counts as 1 regardless of how many sizes are checked.
- Shaped filter counts as 1.

## Alphabetical Navigation

When `sortBy === "artist"`, an `AlphaNav` component renders above the grid. It shows:

- An **All** button (clears `activeBucket`)
- One button per letter bucket computed by `computeBuckets()` from `lib/pagination/buckets.ts`

Selecting a bucket sets `activeBucket` and narrows `displayedRecords` to that bucket. The bucket resets to `null` ("All") whenever `sortBy` changes away from `"artist"`.

### Bucket splitting

`computeBuckets()` groups records by the first letter of their `artistSortKey`. If a letter group exceeds `MAX_BUCKET_SIZE` (default 100), it is split by second letter into sub-buckets (e.g. `Ba–Bm`, `Bn–Bz`). Non-alpha starters go into a `#` bucket, which always sorts last.

## Loading / Error / Empty States

| Condition | UI shown |
|---|---|
| `isLoading === true` | Spinning loader + "Loading your collection..." |
| `errorMessage` set | Error text |
| `records.length === 0` | "Your collection is empty" prompt |
| Filters active, no matches | `0 of N shown` (grid renders empty) |

## Usage Example

```tsx
"use client";
import { useState, useCallback } from "react";
import RecordShelf from "@/components/records/RecordShelf";
import SearchBar from "@/components/records/SearchBar";

export default function Page() {
  const [refreshKey, setRefreshKey] = useState(0);
  const handleAdded = useCallback(() => setRefreshKey(k => k + 1), []);

  return (
    <>
      <SearchBar onRecordAdded={handleAdded} />
      <RecordShelf refreshKey={refreshKey} />
    </>
  );
}
```

## Files

| File | Purpose |
|---|---|
| `components/records/RecordShelf.tsx` | Component logic |
| `components/records/RecordShelf.module.scss` | Scoped styles |
| `components/records/AlphaNav.tsx` | Alphabetical nav bar component |
| `components/records/AlphaNav.module.scss` | Nav bar styles |
| `lib/pagination/buckets.ts` | `computeBuckets()`, `artistSortKey()`, `AlphaBucket` type |

## Related

- [RecordCard](./record-card.md) — rendered inside the shelf grid
- [SearchBar](./search-bar.md) — triggers `refreshKey` increment via callback
- [API: GET /api/records](../api/README.md)
