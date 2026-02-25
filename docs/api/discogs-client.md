# Discogs client reference

Source: `lib/discogs/client.ts`

## Factory

```ts
import { createDiscogsClient } from "@/lib/discogs/client";
const client = createDiscogsClient();
```

Reads `DISCOGS_USER_AGENT` (default: `"MyRecordCollection/1.0"`) and `DISCOGS_TOKEN` from env.

## Search methods

All include `&format=Vinyl` (vinyl only).

| Method | Params | Discogs endpoint |
|--------|--------|------------------|
| `searchByCatalogNumber(catno)` | catalog string | `GET /database/search?catno=&type=release&format=Vinyl` |
| `searchByArtistAndTitle(artist, title)` | two strings | `GET /database/search?artist=&title=&type=release&format=Vinyl` |
| `searchByUPC(upc)` | barcode string | `GET /database/search?barcode=&type=release&format=Vinyl` |

Return: `DiscogsSearchResult[]`

## Release method

```ts
async getRelease(releaseId: number): Promise<DiscogsRelease>
```

`GET /releases/{releaseId}`. Cached 1 hour via `next: { revalidate: 3600 }`.

## Vinyl extraction methods

| Method | Input | Output |
|--------|-------|--------|
| `extractRecordSize(formats?)` | `DiscogsFormat[]` | `string \| null` — matches `"`, `inch`, `7`, `10`, `12` in descriptions |
| `extractVinylColor(formats?)` | `DiscogsFormat[]` | `string \| null` — matches color keywords, falls back to `text` field |
| `isShapedVinyl(formats?)` | `DiscogsFormat[]` | `boolean` — matches `Picture Disc`, `Shaped`, `Shape`, `Picture` |

All look for `format.name === "Vinyl"` first.

Color keywords: `Vinyl`, `Colored`, `Clear`, `Transparent`, `Marble`, `Splatter`, `Black`, `White`, `Red`, `Blue`, `Green`, `Yellow`, `Purple`, `Pink`, `Orange`, `Grey`.

## Rate limiting

Token bucket: 60/min authenticated, 25/min unauthenticated. 429 retry: max 3 attempts, honours `Retry-After`.

## Types

```ts
interface DiscogsFormat {
  name: string; qty: string; descriptions?: string[]; text?: string;
}

interface DiscogsSearchResult {
  id: number; title: string; year: string; thumb: string;
  cover_image: string; resource_url: string; type: string;
  catno?: string; barcode?: string[];
}

interface DiscogsRelease {
  id: number; title: string; artists: { name: string }[];
  year: number; labels: { name: string; catno: string }[];
  genres: string[]; styles: string[]; thumb: string;
  cover_image: string; uri: string; formats?: DiscogsFormat[];
}
```

## Related

- [Discogs integration endpoints](./endpoints/discogs-integration.md)
- [Vinyl metadata](../features/vinyl-metadata.md)
