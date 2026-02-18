# Flip Card Animation

Documentation for the 3D flip card animation implementation.

## Overview

The record cards use CSS 3D transforms to create a flip animation that reveals detailed information on the back. When flipped, the card elevates with border and shadow effects for visual depth.

## Key Features

- **3D Transform**: Realistic flip using CSS perspective and rotateY
- **No Text Bleed-Through**: Proper backface-visibility prevents reversed text from showing
- **Content-Driven Sizing**: Card width 180px, height determined by content (no min-height)
- **Z-Index Elevation**: Flipped card appears above other cards
- **Border and Shadow**: Layered drop-shadow and bronze border for 3D depth
- **Smooth Animation**: 0.6s transition for flip
- **Sharp Edges**: All elements use border-radius: 0px

## CSS Implementation

### Container Setup

```css
/* styles/globals.scss */

.flip-card {
  perspective: 1500px;
  width: 180px;
  position: relative;
  z-index: 1;
  transition: transform 0.4s ease, width 0.4s ease, margin 0.4s ease;
}

.flip-card:hover:not(.flipped) {
  transform: translateY(-2px);
}
```

**Key Properties:**
- `perspective: 1500px` - Creates 3D space for transform
- `width: 180px` - Card width; height is content-driven (no min-height)
- `position: relative` - Enables z-index control
- Transition includes `width` and `margin` for the width-expansion on flip
- Hover lift provides subtle interactivity feedback

### Flipped State

```css
/* CRITICAL: filter MUST be on .flip-card, NOT on .flip-card-inner.
   filter on an element with transform-style: preserve-3d flattens
   3D transforms, breaking backface-visibility entirely. */
.flip-card.flipped {
  z-index: 1000;
  width: 250px;
  margin-left: -35px;
  margin-right: -35px;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25))
          drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
}
```

**Key Properties:**
- `z-index: 1000` - Brings card to front, above all other cards
- `width: 250px` - Widens card to fit 216px back thumbnail
- `margin-left/right: -35px` - Negative margins center the wider card without shifting the grid layout
- `filter` on **outer container** - Creates depth without breaking 3D context
- **No scaling** - Text stays at original size. Width-only expansion, never `transform: scale()`

### Inner Container

```css
.flip-card-inner {
  position: relative;
  width: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.flip-card.flipped .flip-card-inner {
  transform: rotateY(180deg);
}
```

**Key Properties:**
- `transform-style: preserve-3d` - Maintains 3D positioning of children. **This is the ONLY element that should have this property.**
- `transition: transform 0.6s` - 0.6 second flip animation
- `rotateY(180deg)` - Rotates 180 degrees around Y-axis when flipped

### Card Faces

```css
.flip-card-front,
.flip-card-back {
  width: 100%;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  -moz-backface-visibility: hidden;
  background-color: var(--warm-bg-primary);
  /* Do NOT add transform-style: preserve-3d here. See anti-patterns below. */
}
```

**Key Properties:**
- Front face is `position: relative` (sets container height naturally)
- Back face is `position: absolute` (overlays the front)
- `backface-visibility: hidden` - **Critical for preventing text bleed-through**
- Vendor prefixes (`-webkit-`, `-moz-`) - Browser compatibility
- `background-color` - Solid opaque background

### Front Face

```css
.flip-card-front {
  position: relative;
  transform: rotateY(0deg);
  border: 1px solid var(--warm-bg-tertiary);
  border-radius: 0;
  box-shadow: 0 1px 3px rgba(62, 92, 47, 0.08);
}
```

**Key Properties:**
- `transform: rotateY(0deg)` - Explicit starting position
- `border` - Subtle 1px border for card definition
- No z-index needed - 3D context handles face ordering

### Back Face

```css
.flip-card-back {
  position: absolute;
  top: 0;
  left: 0;
  transform: rotateY(180deg);
  background-color: var(--warm-bg-secondary);
  border: 2px solid #8BA87A; /* warm sage */
  border-radius: 0;
}
```

**Key Properties:**
- `position: absolute; top: 0; left: 0` - Overlays the front face
- `transform: rotateY(180deg)` - Starts rotated, faces correct direction when flipped
- `border: 2px solid #C9A876` - Thicker bronze border for 3D depth
- Component handles internal padding (not CSS)

## React Component Implementation

### Component Structure

```tsx
// components/records/RecordCard.tsx
// flip-card / flipped are global classes (styles/globals.scss) — JS toggles
// them by string so they cannot be CSS Modules scoped classes.
export default function RecordCard({ record }: RecordCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div
      className={`flip-card${isFlipped ? " flipped" : ""}`}
      style={{ cursor: "pointer" }}
      onClick={handleCardClick}
    >
      <div className="flip-card-inner">
        <div className="flip-card-front">
          {/* Album art and basic info — inner layout via RecordCard.module.scss */}
        </div>
        <div className="flip-card-back">
          {/* Detailed information — inner layout via RecordCard.module.scss */}
        </div>
      </div>
    </div>
  );
}
```

### State Management

```tsx
const [isFlipped, setIsFlipped] = useState(false);
```

- Uses React state to track flip status
- Boolean: `false` = front, `true` = back
- Toggled on click

### Click Handler

```tsx
const handleCardClick = () => {
  setIsFlipped(!isFlipped);
};
```

- Toggles between flipped and unflipped states
- Simple boolean toggle
- Triggers CSS transition via class change

### Conditional Styling

```tsx
className={`flip-card cursor-pointer ${isFlipped ? "flipped" : ""}`}
```

- Adds `flipped` class when `isFlipped === true`
- `cursor-pointer` indicates clickable element
- Template literal for dynamic class names

## Preventing Text Bleed-Through

### The Problem

Without proper configuration, the back face text shows through the front face in reverse:

```
Front Face (Visible)
    |
Back Face Text (Reversed, Showing Through)
```

### The Solution: backface-visibility

```css
.flip-card-front,
.flip-card-back {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  -moz-backface-visibility: hidden;
}
```

**How it works:**
- Hides the back side of an element when rotated away from viewer
- Prevents reversed text from being visible through the front
- Requires vendor prefixes for cross-browser compatibility

**Browser Support:**
- `-webkit-` prefix for Chrome, Safari, Edge
- `-moz-` prefix for Firefox
- Standard property for modern browsers

### Additional Fixes

**Explicit Transform:**
```css
.flip-card-front {
  transform: rotateY(0deg); /* Explicit starting position */
}

.flip-card-back {
  transform: rotateY(180deg); /* Pre-rotated to face correct direction */
}
```

**Opaque Background:**
```css
background-color: var(--warm-bg-primary); /* Solid color, not transparent */
```

## Width expansion on flip

### Why width expansion, not scaling?

**NEVER use `transform: scale()` on flip cards.** Scaling enlarges all text content, making the card too tall and hard to read. Width expansion gives the back face a larger thumbnail without changing any text sizes.

### How it works

When flipped, the card widens from 180px to 250px. Negative margins (totaling -70px) keep it centered in the grid cell without shifting neighboring cards. CSS sets the fallback (-35px each side), and JS overrides the margins at runtime to keep the card within viewport bounds — shifting more margin to one side when the card is near a screen edge.

```css
/* CSS fallback */
.flip-card.flipped {
  z-index: 1000;
  width: 250px;
  margin-left: -35px;
  margin-right: -35px;
  filter: drop-shadow(...);
}
```

```tsx
// JS viewport-aware override (RecordCard.tsx useEffect)
// Computes available space on each side and shifts margins to avoid overflow
```

The back face thumbnail uses `.album-art-size-lg` (216px) instead of `.album-art-size` (144px). Text stays at `0.75rem`/`0.625rem` (10px).

### Containing the overflow

The wider flipped card can extend beyond the page container at grid edges. The JS in `RecordCard.tsx` handles this by computing available space on each side and adjusting `marginLeft`/`marginRight` dynamically to keep the card within viewport bounds.

**Do not use `overflow-x: clip` (or `overflow: clip`) on any ancestor of the grid.** Per CSS spec, setting one overflow axis to a value other than `visible` forces the other axis to clip as well. This causes the rightmost grid column to be visually truncated — vertically and horizontally — even before a flip occurs. The shelf section intentionally has no overflow rule:

```scss
// ✅ Correct: no overflow clipping; JS keeps cards in bounds
.shelfSection {
  max-width: 80rem;
  margin: 0 auto;
  padding: 2rem;
}

// ❌ Wrong: clips both axes, rightmost cards truncated
.shelfSection {
  overflow-x: clip;
}
```

### Z-index elevation

```css
.flip-card {
  z-index: 1; /* Default layer */
}

.flip-card.flipped {
  z-index: 1000; /* Elevated when flipped */
}
```

**Why elevate:**
- Creates visual hierarchy (flipped card is "active")
- Prevents card from being hidden behind neighboring cards
- Wider card overlaps neighbors safely due to z-index

### Layered Drop Shadow

```css
filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25))
        drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
```

**Layered shadow approach:**
- **First layer**: `0 8px 16px rgba(0, 0, 0, 0.25)` - Larger, softer shadow for depth
- **Second layer**: `0 4px 8px rgba(0, 0, 0, 0.15)` - Closer, sharper shadow for definition

**Purpose:**
- Creates realistic 3D depth perception
- Separates flipped card from background
- Enhances "floating" effect without scaling

### Border for Definition

```css
.flip-card-back {
  border: 2px solid #8BA87A; /* warm sage */
}
```

**Sage border benefits:**
- Defines card edges clearly
- Complements warm color palette
- Adds tactile, physical appearance
- Thicker (2px) than front border (1px) for emphasis

## CSS 3D Anti-Patterns

These patterns silently break the flip animation. Avoid them.

### Never put `transform-style: preserve-3d` on card faces

```css
/* WRONG - creates nested 3D contexts that break backface-visibility */
.flip-card-front,
.flip-card-back {
  transform-style: preserve-3d;
}

/* CORRECT - preserve-3d belongs ONLY on the inner container */
.flip-card-inner {
  transform-style: preserve-3d;
}
```

**Why it breaks:** Each face becomes its own 3D rendering context. The browser evaluates `backface-visibility` relative to the face's own context rather than the parent's, causing the back face to be invisible when it should be visible.

### Never put `filter` on an element with `preserve-3d`

```css
/* WRONG - filter flattens 3D transforms */
.flip-card.flipped .flip-card-inner {
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25));
}

/* CORRECT - put filter on the outer container */
.flip-card.flipped {
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25));
}
```

**Why it breaks:** CSS `filter` creates a new stacking context and flattens 3D transforms on the element. When applied to `.flip-card-inner` (which has `transform-style: preserve-3d`), the 3D context is destroyed and `backface-visibility` stops working entirely.

### Never use `height: 100%` on the back face

```css
/* WRONG - background only covers 240px, content overflows transparently */
.flip-card-back {
  height: 100%;
  overflow: visible;
}

/* CORRECT - background grows with content */
.flip-card-back {
  height: auto;
}
```

**Why it breaks:** The back card content (all metadata fields) often exceeds the 240px min-height. With `height: 100%`, the background stops at 240px but content overflows transparently, creating a translucent lower section.

## Animation Timing

### Flip Animation

```css
.flip-card-inner {
  transition: transform 0.6s;
}
```

- **Duration**: 0.6 seconds
- **Easing**: Default (ease-in-out)
- **Property**: Only transform (rotation)
- **Feel**: Smooth, dramatic 3D flip effect

## Responsive Behavior

### Mobile Considerations

The flip card works on mobile with these considerations:

**Click becomes Touch:**
```tsx
onClick={handleCardClick} // Works for both click and touch
```

**Card Size:**
```css
width: 180px; /* Content-driven height, no min-height */
```

### Layout in Grid

Cards are displayed in a responsive grid:

```tsx
// components/records/RecordShelf.tsx
<div className={styles.grid}>
  {records.map((record) => (
    <RecordCard key={record.recordId} record={record} />
  ))}
</div>
```

```scss
// RecordShelf.module.scss
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  column-gap: 1.25rem;
  row-gap: 0;

  @media (min-width: 640px)  { grid-template-columns: repeat(3, 1fr); }
  @media (min-width: 768px)  { grid-template-columns: repeat(4, 1fr); }
  @media (min-width: 1024px) { grid-template-columns: repeat(5, 1fr); }
  @media (min-width: 1280px) { grid-template-columns: repeat(7, 1fr); }
}
```

**Gap spacing:** `1.25rem` column gap, `0` row gap.

## Common Issues and Solutions

### Issue: Card back invisible when flipped

**Symptom:** Back face invisible when flipped, flashes briefly when flipping back

**Cause:** One of two CSS anti-patterns (see CSS 3D Anti-Patterns above):
1. `transform-style: preserve-3d` on card faces
2. `filter` on `.flip-card-inner`

**Solution:** Remove `transform-style` from faces, move `filter` to `.flip-card`.

### Issue: Card back translucent at bottom

**Symptom:** Lower portion of flipped card is see-through, overlapping content below shows through

**Cause:** `height: 100%` limits background to 240px while content overflows

**Solution:**
```css
.flip-card-back {
  height: auto; /* Background grows with content */
}
```

### Issue: Text shows through in reverse

**Symptom:** Back face text visible (reversed) when viewing front

**Solution:**
```css
backface-visibility: hidden;
-webkit-backface-visibility: hidden;
-moz-backface-visibility: hidden;
```

### Issue: Cards overlap when flipped

**Symptom:** Flipped card hidden behind adjacent cards

**Solution:**
```css
.flip-card.flipped {
  z-index: 1000; /* Bring to front */
}
```

### Issue: Rightmost column cards are truncated (vertically and/or horizontally)

**Symptom:** Cards in the last grid column are clipped at the bottom; flipped cards in that column are also cut off horizontally.

**Cause:** `overflow-x: clip` (or `overflow: clip`) on an ancestor of the grid. Per CSS spec, setting one overflow axis forces the other to clip too.

**Solution:** Remove the overflow rule from the shelf container. The `RecordCard` JS already handles viewport edge detection via `getBoundingClientRect()` and adjusts `marginLeft`/`marginRight` to keep flipped cards in bounds.

### Issue: No 3D effect

**Symptom:** Card rotates flat, no perspective

**Solution:**
```css
.flip-card {
  perspective: 1500px;
}

.flip-card-inner {
  transform-style: preserve-3d; /* ONLY on inner container */
}
```

### Issue: Text too small on card

**Symptom:** Hard to read text on front or back

**Solution:** Use `0.75rem bold` for titles (front AND back), `0.75rem` for artist, `0.625rem` (10px) for dense metadata.

## Browser Compatibility

### Modern Browsers

Full support in:
- Chrome 36+
- Firefox 16+
- Safari 9+
- Edge 12+

### Vendor Prefixes

Required for broader compatibility:
```css
-webkit-backface-visibility: hidden; /* Chrome, Safari, Edge */
-moz-backface-visibility: hidden;    /* Firefox */
backface-visibility: hidden;         /* Standard */
```

### Fallback Behavior

Without 3D transform support:
- Card still toggles content via React state
- No flip animation, instant switch
- Functional but less visually appealing

## Performance Considerations

### Hardware Acceleration

CSS transforms use GPU acceleration:
- `transform` property triggers hardware acceleration
- Smooth 60fps animation on modern devices
- Better performance than JavaScript animation

### Repaints and Reflows

Efficient animation properties:
- `transform` - No reflow, GPU accelerated
- `z-index` - No reflow when changed
- `opacity` - No reflow, GPU accelerated

The `width` and `margin` transitions on `.flip-card` do trigger reflow, but:
- Only one card is flipped at a time
- The 3D flip animation (GPU-accelerated `transform`) is the dominant visual
- Width/margin reflow cost is negligible for a single 250px element

## Related Documentation

- [RecordCard Component](../components/record-card.md)
- [Component Architecture](../components/README.md)
- [Coding Standards](../development/coding-standards.md)

---

**Last Updated**: 2026-02-14
