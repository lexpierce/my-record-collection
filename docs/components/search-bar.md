# SearchBar

Source: `components/records/SearchBar.tsx` + `SearchBar.module.scss`

Client component. Three search tabs: artist+title, catalog number, UPC.

## Props

| Prop | Type |
|------|------|
| `onRecordAdded` | `() => void` — triggers shelf re-fetch |

## Search methods

| Tab | API call |
|-----|----------|
| Artist & Title | `GET /api/records/search?artist=&title=` |
| Catalog # | `GET /api/records/search?catalogNumber=` |
| UPC | `GET /api/records/search?upc=` |

Results enriched with `recordSize`, `vinylColor`, `isShapedVinyl`.

## Add flow

1. User clicks "+ Add" on result
2. `POST /api/records/fetch-from-discogs` with `{ releaseId: result.id }`
3. Success → toast (3s) + `onRecordAdded?.()` called
4. Error → inline error message

## Type

```ts
interface DiscogsSearchResult {
  id: number; title: string; year?: string; thumb?: string;
  catno?: string; recordSize?: string | null;
  vinylColor?: string | null; isShapedVinyl?: boolean;
}
```
