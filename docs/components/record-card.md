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

- **Front Side**: 144px album art, title, artist name
- **Back Side**: Thumbnail, all record details, update/delete buttons
- **Interaction**: Click anywhere to flip, hover lifts card
- **Animation**: 3D transform with border and shadow effects (no scaling)
- **Width expansion**: Card widens 180px → 250px on flip for larger back thumbnail
- **Actions**: Update from Discogs, delete with confirmation
- **Dimensions**: 180px wide (250px flipped), content-driven height (no min-height)
- **Sharp Edges**: All elements use border-radius: 0px

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
- **Album art**: 144x144px (`.album-art-size`)
- **Album title**: `text-[11px]`, truncated, `leading-none`
- **Artist name**: `text-[11px]`, truncated, `leading-none`

**Layout:**
```tsx
<div className="flip-card-front p-1.5">
  <div className="flex flex-col items-center">
    <div className="album-art-size bg-warmBg-tertiary overflow-hidden">
      {/* Image */}
    </div>
    <h3 className="text-[11px] font-semibold text-warmText-primary truncate w-full text-center mt-1 leading-none">
      {title}
    </h3>
    <p className="text-[11px] text-warmText-secondary truncate w-full text-center leading-none mt-0.5">
      {artist}
    </p>
  </div>
</div>
```

### Back Face

**Structure:** Thumbnail -> Info -> Buttons

**Content:**
1. **Album thumbnail**: 216x216px at top (centered, `.album-art-size-lg`)
2. **Album title**: `text-[11px] font-semibold` (matches front)
3. **Artist name**: `text-[10px]`
4. **All metadata** (`text-[10px]`):
   - Year, size, color, shaped vinyl status
   - Label, catalog number, UPC
   - Genres, styles
   - Data source, Discogs ID
5. **Action buttons**: `text-[10px]` with `whitespace-nowrap`

**Layout:**
```tsx
<div className="flip-card-back bg-warmBg-secondary p-3">
  <div className="flex flex-col space-y-2">
    <div className="album-art-size-lg mx-auto">{/* Thumbnail — 216px on back */}</div>
    <div className="space-y-1">
      <h3 className="text-[11px] font-semibold">{title}</h3>
      <p className="text-[10px]">{artist}</p>
      {/* All metadata fields */}
    </div>
    <div className="mt-2 border-t flex gap-1">
      <button className="px-2 py-1 text-[10px]">Update</button>
      <button className="px-2 py-1 text-[10px]">Delete</button>
    </div>
  </div>
</div>
```

## Styling

### Card Dimensions
- **Width**: 180px (expands to 250px when flipped via negative margins)
- **Height**: Content-driven (no min-height)
- **Back thumbnail**: 216x216px (`.album-art-size-lg`)

### Design Principles
- **Border Radius**: 0px on all elements (sharp edges)
- **No Tailwind `rounded` classes** anywhere in the component

### Front Card
- **Background**: `#FFF8F0` (warmBg-primary)
- **Border**: 1px solid `#E8D4BA` (subtle)
- **Padding**: `p-1.5` for border-to-image spacing
- **Text Colors**: warmText-primary, warmText-secondary

### Back Card (Flipped)
- **Background**: `#F5E6D3` (warmBg-secondary) - set via both CSS and Tailwind class
- **Border**: 2px solid `#C9A876` (bronze, thicker for emphasis)
- **Height**: `auto` (background covers all content, not just 240px)
- **Opacity**: 1 (explicitly fully opaque)
- **Shadow**: Layered drop-shadow on `.flip-card` (outer container):
  ```css
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25))
          drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
  ```

### Font Sizing
- **Front - Title**: `text-[11px]` with `leading-none`
- **Front - Artist**: `text-[11px]` with `leading-none`
- **Back - Title**: `text-[11px] font-semibold` (matches front)
- **Back - Artist**: `text-[10px]`
- **Back - Details**: `text-[10px]`
- **Back - Buttons**: `text-[10px]`

### Custom CSS
- Custom `.flip-card` utilities in `app/globals.css`
- 3D transform perspective and backface-visibility
- No scaling transforms (natural sizing approach)
- See [Flip Card Animation](../features/flip-card-animation.md) for CSS anti-patterns

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

---

**Last Updated**: 2026-02-14
