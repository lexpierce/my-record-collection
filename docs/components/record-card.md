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
- **Back Side**: Thumbnail, all record details, update/delete buttons
- **Interaction**: Click anywhere to flip
- **Animation**: 3D transform with border and shadow effects (no scaling)
- **Actions**: Update from Discogs, delete with confirmation
- **Dimensions**: 200px wide × 240px minimum height

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
- **Album art**: 96×96px (1" at 96 DPI)
- **Album title**: `text-xs`, no clamp (full text visible)
- **Artist name**: `text-xs`, no clamp (full text visible)

**Layout:**
```tsx
<div className="flex flex-col items-center">
  <div className="album-art-size mb-2">{/* Image */}</div>
  <div className="text-center px-1">
    <h3 className="text-xs font-semibold">{title}</h3>
    <p className="text-xs">{artist}</p>
  </div>
</div>
```

### Back Face

**Structure:** Thumbnail → Info → Buttons

**Content:**
1. **Album thumbnail**: 96×96px at top (centered)
2. **Album title**: `text-xs font-bold`
3. **Artist name**: `text-[10px]`
4. **All metadata** (`text-[10px]`):
   - Year, size, color, shaped vinyl status
   - Value (minimum or median)
   - Label, catalog number, UPC
   - Genres, styles
   - Data source, Discogs ID
5. **Action buttons**: `text-[10px]` with `whitespace-nowrap`

**Layout:**
```tsx
<div className="flex flex-col space-y-2">
  <div className="album-art-size mx-auto">{/* Thumbnail */}</div>
  <div className="space-y-1">
    <h3 className="text-xs font-bold">{title}</h3>
    <p className="text-[10px]">{artist}</p>
    {/* All metadata fields */}
  </div>
  <div className="mt-2 border-t flex gap-1">
    <button className="px-2 py-1 text-[10px]">Update</button>
    <button className="px-2 py-1 text-[10px]">Delete</button>
  </div>
</div>
```

## Styling

### Card Dimensions
- **Width**: 200px
- **Minimum Height**: 240px
- **Calculation**: 96px image + ~36px title (2 lines) + ~18px artist + ~30px spacing

### Front Card
- **Background**: `#FFF8F0` (warmBg-primary)
- **Border**: 1px solid `#E5D4BC` (subtle)
- **Border Radius**: 8px
- **Text Colors**: warmText-primary, warmText-secondary

### Back Card (Flipped)
- **Background**: `#F5E6D3` (warmBg-secondary)
- **Border**: 2px solid `#C9A876` (bronze, thicker for emphasis)
- **Border Radius**: 8px
- **Opacity**: 1 (explicitly fully opaque)
- **Shadow**: Layered drop-shadow for 3D depth:
  ```css
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25))
          drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
  ```

### Font Sizing
- **Front - Title**: `text-xs` (12px)
- **Front - Artist**: `text-xs` (12px)
- **Back - Title**: `text-xs font-bold` (12px)
- **Back - Artist**: `text-[10px]` (10px)
- **Back - Details**: `text-[10px]` (10px)
- **Back - Buttons**: `text-[10px]` (10px)

**Rationale**: `text-xs` minimum for primary content (artist names), `text-[10px]` acceptable for dense metadata.

### Custom CSS
- Custom `.flip-card` utilities in `app/globals.css`
- 3D transform perspective and backface-visibility
- No scaling transforms (natural sizing approach)

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
