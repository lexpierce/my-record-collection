# RecordCard Component

Interactive flip card component for displaying vinyl record information.

## Overview

`RecordCard` displays a vinyl record as a 3D flip card with album art on the front and complete record details with action buttons on the back.

## Props

```typescript
interface RecordCardProps {
  record: Record; // Full database record with all fields
}
```

## Component Type

```tsx
"use client"; // Client component (interactive state)
```

## Features

- **Front Side**: 96px album art (1"), title, artist name
- **Back Side**: All record details, update/delete buttons
- **Interaction**: Click anywhere to flip
- **Animation**: 3D transform with scale and elevation when flipped
- **Actions**: Update from Discogs, delete with confirmation

## State Management

```typescript
const [isFlipped, setIsFlipped] = useState(false);
```

Single boolean state tracks flip status.

## Event Handlers

### handleCardClick

```typescript
const handleCardClick = () => {
  setIsFlipped(!isFlipped);
};
```

Toggles flip state on card click.

### handleUpdateFromDiscogs

```typescript
const handleUpdateFromDiscogs = async () => {
  if (!record.discogsId) {
    alert("This record has no Discogs ID and cannot be updated.");
    return;
  }

  const response = await fetch("/api/records/update-from-discogs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recordId: record.recordId,
      discogsId: record.discogsId,
    }),
  });

  if (response.ok) {
    alert("Record updated successfully! Refresh the page to see changes.");
    window.location.reload();
  }
};
```

Fetches latest Discogs data and updates record.

### handleDeleteAlbum

```typescript
const handleDeleteAlbum = async () => {
  const confirmDelete = confirm(
    `Are you sure you want to delete "${record.albumTitle}" by ${record.artistName}?`
  );

  if (!confirmDelete) return;

  const response = await fetch(`/api/records/${record.recordId}`, {
    method: "DELETE",
  });

  if (response.ok) {
    alert("Record deleted successfully! Refresh the page to see changes.");
    window.location.reload();
  }
};
```

Deletes record after user confirmation.

## Display Fields

### Front Face
- Album art (96x96px, 1" at 96 DPI)
- Album title (line-clamp-2)
- Artist name (line-clamp-1)

### Back Face
All database fields:
- Year, size, color, shaped vinyl status
- Value (minimum or median)
- Label, catalog number, UPC
- Genres, styles
- Data source, Discogs ID

## Styling

- Custom `.flip-card` utilities in `globals.css`
- Tailwind for layout and colors
- Warm color palette from config
- Responsive: proportional scaling on mobile

## Dependencies

- **API Routes**:
  - `POST /api/records/update-from-discogs`
  - `DELETE /api/records/[recordId]`

## Example Usage

```tsx
<RecordCard record={recordFromDatabase} />
```

## Related Documentation

- [Flip Card Animation](../features/flip-card-animation.md)
- [API Routes](../api/README.md)
- [Database Schema](../development/database-schema.md)
