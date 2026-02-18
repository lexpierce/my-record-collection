# Vinyl-Specific Metadata

Documentation for vinyl-specific data model and extraction logic.

## Overview

The My Record Collection application tracks detailed vinyl-specific metadata beyond basic album information. This includes physical characteristics like record size, vinyl color, and whether the record is shaped (picture disc, die-cut, etc.).

## Database Schema

### Vinyl-Specific Fields

The `recordsTable` schema includes three vinyl-specific fields:

```typescript
// lib/db/schema.ts
export const recordsTable = pgTable("records", {
  // ... other fields ...

  // Vinyl-specific information
  recordSize: text("record_size"),        // e.g., "12\"", "7\"", "10\""
  vinylColor: text("vinyl_color"),        // e.g., "Black", "Clear", "Blue Marble"
  isShapedVinyl: boolean("is_shaped_vinyl").default(false), // true if not round
});
```

### Field Descriptions

**recordSize** (`text`, nullable)
- Physical size of the vinyl record
- Common values: `"12\""`, `"7\""`, `"10\""`, `"LP"`, `"Single"`
- Extracted from Discogs format descriptions
- May include additional context (e.g., `"12\" LP"`)

**vinylColor** (`text`, nullable)
- Color or appearance description of the vinyl
- Examples:
  - Standard: `"Black"`, `"Black Vinyl"`
  - Colored: `"Clear"`, `"Blue Vinyl"`, `"Red"`, `"White"`
  - Special: `"Blue Marble"`, `"Splatter"`, `"Transparent Green"`
- Extracted from Discogs format descriptions and text fields
- Preserves original Discogs terminology

**isShapedVinyl** (`boolean`, default: `false`)
- Indicates if the record is non-circular
- Types of shaped vinyl:
  - Picture discs (image printed on vinyl)
  - Die-cut shapes (star, heart, custom shapes)
  - Irregular shapes
- Set to `true` when format includes keywords like "Picture Disc", "Shaped"

## Discogs Format Parsing

### Format Structure

Discogs release data includes a `formats` array with vinyl details:

```typescript
interface DiscogsFormat {
  name: string;           // e.g., "Vinyl", "CD"
  qty: string;            // quantity
  descriptions?: string[]; // e.g., ["LP", "Album", "12\"", "Blue Vinyl"]
  text?: string;          // additional format text
}
```

### Example Discogs Format Data

```json
{
  "formats": [
    {
      "name": "Vinyl",
      "qty": "1",
      "descriptions": ["LP", "Album", "12\"", "33 ⅓ RPM", "Blue Marble"],
      "text": "Gatefold"
    }
  ]
}
```

From this format object, we extract:
- **recordSize**: `"12\""`
- **vinylColor**: `"Blue Marble"`
- **isShapedVinyl**: `false` (no shaped keywords present)

## Extraction Logic

### Record Size Extraction

```typescript
// lib/discogs/client.ts
extractRecordSize(formats?: DiscogsFormat[]): string | null {
  if (!formats) return null;

  const vinylFormat = formats.find(f => f.name === "Vinyl");
  if (!vinylFormat?.descriptions) return null;

  // Look for size indicators in descriptions
  const sizeMatch = vinylFormat.descriptions.find(d =>
    d.includes('"') ||
    d.includes('inch') ||
    d.includes('7') ||
    d.includes('10') ||
    d.includes('12')
  );

  return sizeMatch || null;
}
```

**Logic:**
1. Find the format object with `name === "Vinyl"`
2. Search descriptions array for size indicators
3. Match strings containing: `"`, `inch`, `7`, `10`, or `12`
4. Return first match or `null`

### Vinyl Color Extraction

```typescript
// lib/discogs/client.ts
extractVinylColor(formats?: DiscogsFormat[]): string | null {
  if (!formats) return null;

  const vinylFormat = formats.find(f => f.name === "Vinyl");
  if (!vinylFormat?.descriptions) return null;

  // Common color-related keywords
  const colorKeywords = [
    'Vinyl', 'Colored', 'Clear', 'Transparent', 'Marble', 'Splatter',
    'White', 'Black', 'Red', 'Blue', 'Green', 'Yellow', 'Purple',
    'Pink', 'Orange', 'Grey', 'Gray'
  ];

  const colorDesc = vinylFormat.descriptions.find(d =>
    colorKeywords.some(keyword => d.includes(keyword))
  );

  return colorDesc || (vinylFormat.text && colorKeywords.some(k => vinylFormat.text!.includes(k)) ? vinylFormat.text : null);
}
```

**Logic:**
1. Find the format object with `name === "Vinyl"`
2. Check descriptions array for color keywords
3. If not found in descriptions, check `text` field
4. Return first match or `null`

**Color Keywords:**
- Base terms: `Vinyl`, `Colored`
- Appearance: `Clear`, `Transparent`, `Marble`, `Splatter`
- Colors: `Black`, `White`, `Red`, `Blue`, `Green`, `Yellow`, `Purple`, `Pink`, `Orange`, `Grey`

### Shaped Vinyl Detection

```typescript
// lib/discogs/client.ts
isShapedVinyl(formats?: DiscogsFormat[]): boolean {
  if (!formats) return false;

  const vinylFormat = formats.find(f => f.name === "Vinyl");
  if (!vinylFormat?.descriptions) return false;

  // Keywords indicating shaped/picture discs
  const shapedKeywords = ['Picture Disc', 'Shaped', 'Shape', 'Picture'];

  return vinylFormat.descriptions.some(d =>
    shapedKeywords.some(keyword => d.includes(keyword))
  );
}
```

**Logic:**
1. Find the format object with `name === "Vinyl"`
2. Check descriptions array for shaped keywords
3. Return `true` if any keyword matches, `false` otherwise

**Shaped Keywords:**
- `Picture Disc` - Most common indicator
- `Shaped` - Generic shaped vinyl
- `Shape` - Alternative terminology
- `Picture` - May indicate picture disc

## Data Flow

### 1. Search Flow

```
User Search
    ↓
GET /api/records/search
    ↓
Discogs API Search (first 10 results)
    ↓
For each result: getRelease() to fetch full details
    ↓
Extract vinyl metadata (size, color, shaped)
    ↓
Return enriched search results with vinyl details
    ↓
SearchBar displays vinyl info in preview
```

### 2. Add to Collection Flow

```
User clicks "Add" on search result
    ↓
POST /api/records/fetch-from-discogs
    ↓
Discogs getRelease() for full details
    ↓
Extract vinyl metadata
    ↓
Save to database with all fields
    ↓
Record available in collection
```

### 3. Display Flow

```
Record in database
    ↓
GET /api/records fetches all records
    ↓
RecordCard component receives record
    ↓
Card front: Shows album art, title, artist
    ↓
Card back: Shows ALL fields including vinyl metadata
```

### 4. Update Flow

```
User clicks "Update from Discogs"
    ↓
POST /api/records/update-from-discogs
    ↓
Fetch latest data from Discogs
    ↓
Extract vinyl metadata (may have changed)
    ↓
Update database record
    ↓
User refreshes to see updated data
```

## Display Patterns

### In Search Results

```tsx
// components/records/SearchBar.tsx
{result.recordSize && <span>Size: {result.recordSize}</span>}
{result.vinylColor && <span>Color: {result.vinylColor}</span>}
{result.isShapedVinyl && <span className={styles.resultPicDisc}>Picture Disc</span>}
```

### On Record Card Back

```tsx
// components/records/RecordCard.tsx
{record.recordSize && (
  <div className={styles.metaRow}>
    <span className={styles.metaLabel}>Size:</span>{" "}
    <span className={styles.metaValue}>{record.recordSize}</span>
  </div>
)}
{record.vinylColor && (
  <div className={styles.metaRow}>
    <span className={styles.metaLabel}>Color:</span>{" "}
    <span className={styles.metaValue}>{record.vinylColor}</span>
  </div>
)}
{record.isShapedVinyl && (
  <div className={styles.metaRow}>
    <span className={styles.metaLabel}>Type:</span>{" "}
    <span className={styles.metaValue}>Shaped/Picture Disc</span>
  </div>
)}
```

(CSS module classes from `RecordCard.module.scss`; no Tailwind in this project.)

## Edge Cases

### Missing Format Data

**Scenario**: Discogs release has no format information
**Handling**: All vinyl fields set to `null` or `false`, record still saved

### Non-Vinyl Formats

**Scenario**: Format name is "CD" or other non-vinyl
**Handling**: Extraction methods return `null`/`false`, search filters by `&format=Vinyl`

### Ambiguous Descriptions

**Scenario**: Description like "Clear Blue" (could be color or transparency)
**Handling**: Preserve exact Discogs string, let user interpret

### Multiple Formats

**Scenario**: Release has multiple vinyl formats (e.g., LP + 7")
**Handling**: Extract from first vinyl format found in array

### Special Characters

**Scenario**: Size includes Unicode (e.g., "12\" 33 ⅓ RPM")
**Handling**: Use `text` type in database to preserve all characters

## Rate Limiting Considerations

### Search Endpoint

The search API fetches full release details for vinyl metadata:

```typescript
// app/api/records/search/route.ts
const resultsWithDetails = await Promise.all(
  searchResults.slice(0, 10).map(async (result) => {
    const releaseData = await discogsClient.getRelease(result.id);
    // Extract vinyl metadata...
  })
);
```

**Rate Limiting:**
- Limited to first 10 search results
- Respects 60 req/min limit (authenticated)
- Built-in token bucket rate limiter prevents exceeding limits

## Future Enhancements

Potential improvements to vinyl metadata:

- **Pressing Information**: Country, year of pressing
- **Condition Tracking**: Vinyl and sleeve condition grades
- **Weight**: Standard vs heavyweight vinyl (120g, 180g, 200g)
- **RPM**: Rotation speed (33⅓, 45, 78)
- **Special Features**: Colored inner sleeves, inserts, posters
- **Edition**: First pressing, reissue, limited edition

## Related Documentation

- [Discogs Client Documentation](../api/discogs-client.md)
- [Database Schema](../development/database-schema.md) (future)
- [API Routes](../api/README.md)
- [Component Documentation](../components/README.md)
