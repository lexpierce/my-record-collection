# Discogs API Client

Documentation for the Discogs API client implementation.

## Overview

The Discogs client (`lib/discogs/client.ts`) provides a TypeScript wrapper around the Discogs API with built-in rate limiting and vinyl-specific data extraction helpers.

## Client Initialization

```typescript
import { createDiscogsClient } from "@/lib/discogs/client";

const discogsClient = createDiscogsClient();
```

The client is configured via environment variables:

- `DISCOGS_USER_AGENT` - User agent string (default: "MyRecordCollection/1.0")
- `DISCOGS_TOKEN` - Personal access token for authenticated requests

## Rate Limiting

### Discogs API Limits

- **Authenticated**: 60 requests per minute
- **Unauthenticated**: 25 requests per minute

### Implementation

```typescript
class RateLimiter {
  private lastRequestTime: number = 0;
  private readonly minimumDelayMilliseconds: number;

  constructor(requestsPerMinute: number) {
    this.minimumDelayMilliseconds = (60 * 1000) / requestsPerMinute;
  }

  async waitForNextRequest(): Promise<void> {
    const currentTime = Date.now();
    const timeSinceLastRequest = currentTime - this.lastRequestTime;

    if (timeSinceLastRequest < this.minimumDelayMilliseconds) {
      const delayNeeded = this.minimumDelayMilliseconds - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, delayNeeded));
    }

    this.lastRequestTime = Date.now();
  }
}
```

**Algorithm**: Token bucket

- Calculates minimum delay between requests
- Automatically waits before each request if needed
- Ensures compliance with rate limits

## Search Methods

### Search by Catalog Number

```typescript
async searchByCatalogNumber(catalogNumber: string): Promise<DiscogsSearchResult[]>
```

Searches for vinyl releases by catalog number.

**Parameters:**

- `catalogNumber` (string) - Label catalog number (e.g., "SHVL 804")

**Returns:** Array of matching vinyl releases

**API Call:**

```text
GET /database/search?catno={catalogNumber}&type=release&format=Vinyl
```

**Example:**

```typescript
const results = await discogsClient.searchByCatalogNumber("SHVL 804");
```

### Search by Artist and Title

```typescript
async searchByArtistAndTitle(artistName: string, albumTitle: string): Promise<DiscogsSearchResult[]>
```

Searches for vinyl releases by artist name and album title.

**Parameters:**

- `artistName` (string) - Artist or band name
- `albumTitle` (string) - Album or release title

**Returns:** Array of matching vinyl releases

**API Call:**

```text
GET /database/search?artist={artistName}&title={albumTitle}&type=release&format=Vinyl
```

**Example:**

```typescript
const results = await discogsClient.searchByArtistAndTitle("Pink Floyd", "The Dark Side of the Moon");
```

### Search by UPC

```typescript
async searchByUPC(upcCode: string): Promise<DiscogsSearchResult[]>
```

Searches for vinyl releases by UPC/barcode.

**Parameters:**

- `upcCode` (string) - UPC barcode (e.g., "724384260804")

**Returns:** Array of matching vinyl releases

**API Call:**

```text
GET /database/search?barcode={upcCode}&type=release&format=Vinyl
```

**Example:**

```typescript
const results = await discogsClient.searchByUPC("724384260804");
```

### Vinyl-Only Filtering

All search methods include `&format=Vinyl` to return only vinyl releases:

- Excludes CDs, cassettes, digital, etc.
- Ensures vinyl-specific metadata is available
- Matches the application's focus on vinyl collecting

## Release Methods

### Get Release Details

```typescript
async getRelease(releaseId: number): Promise<DiscogsRelease>
```

Fetches complete information about a specific release.

**Parameters:**

- `releaseId` (number) - Discogs release ID

**Returns:** Full release object with all metadata

**API Call:**

```text
GET /releases/{releaseId}
```

**Example:**

```typescript
const release = await discogsClient.getRelease(123456);
```

**Release Object:**

```typescript
interface DiscogsRelease {
  id: number;
  title: string;
  artists: Array<{ name: string }>;
  year: number;
  labels: Array<{ name: string; catno: string }>;
  genres: string[];
  styles: string[];
  thumb: string;           // Thumbnail URL
  cover_image: string;     // Full cover URL
  uri: string;             // Discogs URI
  formats?: DiscogsFormat[]; // Vinyl format details
}
```

## Vinyl Extraction Methods

### Extract Record Size

```typescript
extractRecordSize(formats?: DiscogsFormat[]): string | null
```

Extracts record size from Discogs format descriptions.

**Parameters:**

- `formats` (DiscogsFormat[], optional) - Formats array from release data

**Returns:** Size string (e.g., `"12\""`) or `null`

**Logic:**

1. Finds format with `name === "Vinyl"`
2. Searches descriptions for size indicators
3. Matches strings containing: `"`, `inch`, `7`, `10`, or `12`

**Examples:**

```typescript
// Format: ["LP", "Album", "12\"", "33 ⅓ RPM"]
extractRecordSize(formats); // "12\""

// Format: ["7\"", "Single", "45 RPM"]
extractRecordSize(formats); // "7\""

// Format: ["Vinyl", "Album"]
extractRecordSize(formats); // null
```

### Extract Vinyl Color

```typescript
extractVinylColor(formats?: DiscogsFormat[]): string | null
```

Extracts vinyl color description from Discogs format data.

**Parameters:**

- `formats` (DiscogsFormat[], optional) - Formats array from release data

**Returns:** Color string (e.g., `"Blue Marble"`) or `null`

**Logic:**

1. Finds format with `name === "Vinyl"`
2. Searches descriptions for color keywords
3. Falls back to `text` field if not in descriptions

**Color Keywords:**

- Base: `Vinyl`, `Colored`
- Appearance: `Clear`, `Transparent`, `Marble`, `Splatter`
- Colors: `Black`, `White`, `Red`, `Blue`, `Green`, `Yellow`, `Purple`, `Pink`, `Orange`, `Grey`

**Examples:**

```typescript
// Format descriptions: ["LP", "Blue Vinyl"]
extractVinylColor(formats); // "Blue Vinyl"

// Format descriptions: ["LP", "Clear"], text: "Transparent"
extractVinylColor(formats); // "Clear"

// Format descriptions: ["LP", "Album"]
extractVinylColor(formats); // null
```

### Detect Shaped Vinyl

```typescript
isShapedVinyl(formats?: DiscogsFormat[]): boolean
```

Determines if the vinyl is shaped (non-circular).

**Parameters:**

- `formats` (DiscogsFormat[], optional) - Formats array from release data

**Returns:** `true` if shaped/picture disc, `false` otherwise

**Logic:**

1. Finds format with `name === "Vinyl"`
2. Checks descriptions for shaped keywords
3. Returns boolean result

**Shaped Keywords:**

- `Picture Disc` - Most common indicator
- `Shaped` - Generic shaped vinyl
- `Shape` - Alternative terminology
- `Picture` - May indicate picture disc

**Examples:**

```typescript
// Format descriptions: ["12\"", "Picture Disc", "Album"]
isShapedVinyl(formats); // true

// Format descriptions: ["LP", "Album", "Gatefold"]
isShapedVinyl(formats); // false
```

## Usage in API Routes

### Search Endpoint

```typescript
// app/api/records/search/route.ts
const discogsClient = createDiscogsClient();

// Perform search
const searchResults = await discogsClient.searchByArtistAndTitle(
  artistName,
  albumTitle
);

// Enrich first 10 results with vinyl details
const resultsWithDetails = await Promise.all(
  searchResults.slice(0, 10).map(async (result) => {
    const releaseData = await discogsClient.getRelease(result.id);
    const recordSize = discogsClient.extractRecordSize(releaseData.formats);
    const vinylColor = discogsClient.extractVinylColor(releaseData.formats);
    const isShapedVinyl = discogsClient.isShapedVinyl(releaseData.formats);

    return {
      ...result,
      recordSize,
      vinylColor,
      isShapedVinyl,
    };
  })
);
```

### Fetch and Save Endpoint

```typescript
// app/api/records/fetch-from-discogs/route.ts
const discogsClient = createDiscogsClient();

// Fetch release details
const releaseData = await discogsClient.getRelease(releaseId);
// Extract vinyl metadata
const recordSize = discogsClient.extractRecordSize(releaseData.formats);
const vinylColor = discogsClient.extractVinylColor(releaseData.formats);
const isShapedVinyl = discogsClient.isShapedVinyl(releaseData.formats);

// Save to database with all fields
const newRecordData = {
  artistName: releaseData.artists[0]?.name,
  albumTitle: releaseData.title,
  recordSize,
  vinylColor,
  isShapedVinyl,
  // ... other fields
};
```

## Error Handling

The client uses standard error handling patterns:

```typescript
if (!response.ok) {
  throw new Error(
    `Discogs API error: ${response.status} ${response.statusText}`
  );
}
```

**Common Errors:**

- `401 Unauthorized` - Invalid or missing DISCOGS_TOKEN
- `404 Not Found` - Release doesn't exist
- `429 Too Many Requests` - Rate limit exceeded (shouldn't happen with rate limiter)
- `500 Internal Server Error` - Discogs API issues

API routes catch and log errors:

```typescript
try {
  const releaseData = await discogsClient.getRelease(releaseId);
} catch (error) {
  console.error("Error fetching from Discogs:", error);
  return NextResponse.json(
    { error: "Failed to fetch from Discogs" },
    { status: 500 }
  );
}
```

## Caching

Responses are cached by Next.js for 1 hour:

```typescript
const response = await fetch(`${this.baseUrl}${endpoint}`, {
  headers,
  next: { revalidate: 3600 }, // Cache for 1 hour
});
```

**Benefits:**

- Reduces API calls for repeated requests
- Improves response times
- Helps stay within rate limits

## Configuration

### Environment Variables

Required in `.env`:

```bash
DISCOGS_TOKEN=your_discogs_token_here
DISCOGS_USER_AGENT=MyRecordCollection/1.0
```

**Getting a Token:**

1. Go to [Discogs Developer Settings](https://www.discogs.com/settings/developers)
2. Create a new Personal Access Token
3. Copy token to `.env` file

### Client Instance

The client is created as a singleton via `createDiscogsClient()`:

```typescript
export function createDiscogsClient(): DiscogsClient {
  const userAgent = process.env.DISCOGS_USER_AGENT || "MyRecordCollection/1.0";
  const token = process.env.DISCOGS_TOKEN;

  return new DiscogsClient(userAgent, token);
}
```

## Type Definitions

### DiscogsFormat

```typescript
interface DiscogsFormat {
  name: string;           // Format type (e.g., "Vinyl", "CD")
  qty: string;            // Quantity
  descriptions?: string[]; // Format details (size, color, etc.)
  text?: string;          // Additional format text
}
```

### DiscogsSearchResult

```typescript
interface DiscogsSearchResult {
  id: number;             // Release ID
  title: string;          // Release title
  year: string;           // Release year
  thumb: string;          // Thumbnail image URL
  cover_image: string;    // Full cover image URL
  resource_url: string;   // API resource URL
  type: string;           // Resource type
  catno?: string;         // Catalog number
  barcode?: string[];     // Barcode/UPC codes
}
```

## Testing the Client

### Manual Testing

```typescript
// Test in Node REPL or API route
import { createDiscogsClient } from "@/lib/discogs/client";

const client = createDiscogsClient();

// Test search
const results = await client.searchByArtistAndTitle("Beatles", "Abbey Road");
console.log(results);

// Test release fetch
const release = await client.getRelease(results[0].id);
console.log(release);

// Test vinyl extraction
console.log(client.extractRecordSize(release.formats));
console.log(client.extractVinylColor(release.formats));
console.log(client.isShapedVinyl(release.formats));
```

## Related Documentation

- [Vinyl Metadata Documentation](../features/vinyl-metadata.md)
- [API Endpoints](./README.md)
- [Database Schema](../development/database-schema.md) (future)
