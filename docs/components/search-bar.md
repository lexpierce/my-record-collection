# SearchBar Component

Searches the Discogs database and adds results to the local collection.

## Overview

`SearchBar` is a client component (`"use client"`) with three search tabs. It calls
`GET /api/records/search` and displays enriched results (including vinyl size, color, and picture-disc flag). The user can then click **+ Add** on any result to call `POST /api/records/fetch-from-discogs`.

```tsx
import SearchBar from "@/components/records/SearchBar";

<SearchBar onRecordAdded={() => setRefreshKey(k => k + 1)} />
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `onRecordAdded` | `() => void` | `undefined` | Called after a record is successfully added. Use this to trigger a shelf re-fetch. |

## Search Methods

### Artist & Title (default tab)

Requires both fields. Calls:

```
GET /api/records/search?artist=<artist>&title=<title>
```

### Catalog #

Searches by label catalog number (e.g. `SHVL-804`). Calls:

```
GET /api/records/search?catalogNumber=<catno>
```

### UPC

Searches by barcode/UPC. Calls:

```
GET /api/records/search?upc=<upc>
```

## Results

Results come from the search API enriched with full vinyl details (each result has `getRelease()` called on it server-side, limited to the first 10 results to respect rate limits).

Each result item shows:
- Thumbnail image (if available)
- Title
- Year (if available)
- Catalog number (if available)
- Record size (if available)
- Vinyl color (if available)
- "Picture Disc" badge (if `isShapedVinyl === true`)
- **+ Add** button

## State

| Name | Type | Purpose |
|---|---|---|
| `searchMethod` | `"catalog" \| "artistTitle" \| "upc"` | Active tab |
| `catalogNumber` | `string` | Catalog # input value |
| `artistName` | `string` | Artist input value |
| `albumTitle` | `string` | Title input value |
| `upcCode` | `string` | UPC input value |
| `isSearching` | `boolean` | True while search API call is in flight |
| `searchResults` | `DiscogsSearchResult[]` | Enriched results from the API |
| `showResults` | `boolean` | Whether the results list is visible |
| `errorMessage` | `string` | Validation or API error |
| `successMessage` | `string` | Shown for 3 seconds after a successful add |

## Add Flow

When the user clicks **+ Add**:

1. `POST /api/records/fetch-from-discogs` is called with `{ releaseId: result.id }`.
2. On success: success message shown for 3 s, `onRecordAdded?.()` is called.
3. On error: error message shown.

The add is non-blocking — the shelf re-fetches without a full page reload.

## Type: `DiscogsSearchResult`

Defined locally in `SearchBar.tsx`:

```ts
interface DiscogsSearchResult {
  id: number;
  title: string;
  year?: string;
  thumb?: string;
  catno?: string;
  recordSize?: string | null;
  vinylColor?: string | null;
  isShapedVinyl?: boolean;
}
```

## Files

| File | Purpose |
|---|---|
| `components/records/SearchBar.tsx` | Component logic |
| `components/records/SearchBar.module.scss` | Scoped styles |

## Related

- [API: GET /api/records/search](../api/README.md)
- [API: POST /api/records/fetch-from-discogs](../api/README.md)
- [RecordShelf](./record-shelf.md) — receives `onRecordAdded` callback
