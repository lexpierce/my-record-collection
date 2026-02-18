# Feature Documentation

Documentation for key features of the My Record Collection application.

## Core Features

### Record Collection Management

- View your vinyl record collection in a visual shelf layout
- Flip cards to see detailed information
- Update records with latest Discogs data
- Delete records from your collection

### Discogs Integration

- Search for records by artist/title, catalog number, or UPC
- Automatically fetch detailed information from Discogs
- Extract vinyl-specific metadata (size, color, shaped vinyl)
- Preview record details before adding to collection

### Vinyl-Specific Metadata

- Record size (7", 10", 12")
- Vinyl color (Black, Clear, Colored variants)
- Shaped vinyl detection (Picture discs, shaped records)
- Genre and style classification

### User Interface

- Warm color palette with Inter font
- Flip card animation with 3D transforms and width expansion (180px → 250px on flip)
  - Sort by artist, title, or year (ascending/descending)
  - Filter by record size and shaped/picture disc
  - Alphabetical nav with dynamic range labels (`A–C`, `Ba–Bm`) — pages cap at 50 records, small adjacent letter groups are merged
  - No-reload record adding (inline success toast)
- Mobile-responsive layout

## Detailed Feature Documentation

- [x] [Flip card animation](./flip-card-animation.md)
- [x] [Vinyl-specific metadata](./vinyl-metadata.md)
- [x] [Discogs search and integration workflow](./discogs-integration.md)

## Planned Features

Future enhancements tracked in beads:

- Manual record entry (without Discogs)
- Collection statistics
