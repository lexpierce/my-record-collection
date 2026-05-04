# Search panel

The search panel is static Astro markup in `src/pages/index.astro` with behavior in `src/scripts/record-app.ts`.

## Search methods

| Tab | API call |
|-----|----------|
| Artist & Title | `GET /api/records/search?artist=&title=` |
| Catalog # | `GET /api/records/search?catalogNumber=` |
| UPC | `GET /api/records/search?upc=` |

Results are enriched with `recordSize`, `vinylColor`, and `isShapedVinyl`.

## Add flow

1. User clicks `+ Add` on a result.
2. Browser sends `POST /api/records/fetch-from-discogs` with `{ releaseId }`.
3. Success shows a 3-second success message.
4. Shelf refreshes via `loadRecords()` without a full-page reload.
5. Errors render inline in `[data-search-error]`.

## Types

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
