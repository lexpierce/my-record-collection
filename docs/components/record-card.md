# RecordCard Component

Interactive flip card component for displaying vinyl record information.

## Overview

`RecordCard` displays a vinyl record as a 3D flip card with album art on the front and complete record details with action buttons on the back.

## Props

```typescript
interface RecordCardProps {
  record: Record;           // Full database record with all fields
  onRecordMutated: () => void; // Called after any successful update or delete
}
```

The parent (`RecordShelf`) bumps a `mutationKey` counter on this callback to trigger a re-fetch of the record list. Never pass `window.location.reload` — use the callback pattern.

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
- **Actions**: Update from Discogs, delete with confirmation (uses `window.confirm` — TODO: replace with inline UI)
- **Accessibility**: `role="button"`, `tabIndex={0}`, `aria-expanded`, keyboard handler (Enter/Space)
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
    onRecordMutated(); // signals RecordShelf to re-fetch — no page reload
  }
};
```

Fetches latest Discogs data and updates record. Calls `onRecordMutated` on success.

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
    onRecordMutated(); // signals RecordShelf to re-fetch — no page reload
  }
};
```

Deletes record after user confirmation. Calls `onRecordMutated` on success.

## Display Fields

### Front face
- **Album art**: 144x144px (`.album-art-size` global class)
- **Album title**: `0.75rem` bold, truncated, `line-height: 1`
- **Artist name**: `0.75rem`, truncated, `line-height: 1`

**Layout:**
```tsx
// Global classes (flip-card-front, album-art-size) are in styles/globals.scss.
// Inner layout classes come from RecordCard.module.scss.
<div className="flip-card-front">
  <div className={styles.cardFrontContent}>
    <div className={`album-art-size ${styles.albumArtWrapper}`}>
      {/* Image */}
    </div>
    <h3 className={styles.albumTitle}>{title}</h3>
    <p className={styles.albumArtist}>{artist}</p>
  </div>
</div>
```

### Back Face

**Structure:** Thumbnail -> Info -> Buttons

**Content:**
1. **Album thumbnail**: 216x216px at top (centered, `.album-art-size-lg` global class)
2. **Album title**: `0.75rem` bold (matches front)
3. **Artist name**: `0.75rem`
4. **All metadata** (`0.625rem` / 10px):
   - Year, size, color, shaped vinyl status
   - Label, catalog number, UPC
   - Genres, styles
   - Data source, Discogs ID
5. **Action buttons**: `0.625rem` with `white-space: nowrap`

**Layout:**
```tsx
// Global classes (flip-card-back, album-art-size-lg) are in styles/globals.scss.
// Inner layout classes come from RecordCard.module.scss.
<div className="flip-card-back">
  <div className={styles.cardBack}>
    <div className={`album-art-size-lg ${styles.albumArtWrapperLg}`}>{/* Thumbnail */}</div>
    <div>
      <h3 className={styles.metaTitle}>{title}</h3>
      <p className={styles.metaArtist}>{artist}</p>
      <div className={styles.metaSection}>{/* metadata rows */}</div>
    </div>
    <div className={styles.actions}>
      <button className={styles.btnUpdate}>Update</button>
      <button className={styles.btnDelete}>Delete</button>
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
- **No border-radius** anywhere in the component (sharp edges throughout)

### Front card
- **Background**: `var(--warm-bg-primary)` (warm cream)
- **Border**: `1px solid var(--warm-bg-tertiary)` (subtle)
- **Padding**: `0.375rem` for border-to-image spacing
- **Text Colors**: `var(--warm-text-primary)`, `var(--warm-text-secondary)`

### Back card (flipped)
- **Background**: `var(--warm-bg-secondary)` (light sage cream)
- **Border**: `2px solid #8BA87A` (warm sage, thicker for emphasis)
- **Height**: `auto` (background covers all content, not just 240px)
- **Opacity**: 1 (explicitly fully opaque)
- **Shadow**: Layered drop-shadow on `.flip-card` (outer container):
  ```css
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25))
          drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
  ```

### Font sizing
- **Front - Title**: `0.75rem` bold, `line-height: 1`
- **Front - Artist**: `0.75rem`, `line-height: 1`
- **Back - Title**: `0.75rem` bold (matches front)
- **Back - Artist**: `0.75rem`
- **Back - Details**: `0.625rem` (10px)
- **Back - Buttons**: `0.625rem` (10px)

### Custom CSS
- Global `.flip-card` classes in `styles/globals.scss`
- 3D transform perspective and backface-visibility
- No scaling transforms (natural sizing approach)
- See [Flip Card Animation](../features/flip-card-animation.md) for CSS anti-patterns

## Dependencies

- **API Routes**:
  - `POST /api/records/update-from-discogs`
  - `DELETE /api/records/[recordId]`

## Example Usage

```tsx
<RecordCard
  record={recordFromDatabase}
  onRecordMutated={() => setMutationKey(k => k + 1)}
/>
```

## Related Documentation

- [Flip Card Animation](../features/flip-card-animation.md)
- [API Routes](../api/README.md)
- [Database Schema](../development/database-schema.md)

---

**Last Updated**: 2026-02-18
