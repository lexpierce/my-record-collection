# Flip Card Animation

Documentation for the 3D flip card animation implementation.

## Overview

The record cards use CSS 3D transforms to create a flip animation that reveals detailed information on the back. When flipped, the card elevates with border and shadow effects for visual depth.

## Key Features

- **3D Transform**: Realistic flip using CSS perspective and rotateY
- **No Text Bleed-Through**: Proper backface-visibility prevents reversed text from showing
- **Natural Sizing**: Card sized appropriately (200px × 240px) without scaling
- **Z-Index Elevation**: Flipped card appears above other cards
- **Border and Shadow**: Layered drop-shadow and bronze border for 3D depth
- **Smooth Animation**: 0.6s transition for flip

## CSS Implementation

### Container Setup

```css
/* app/globals.css */

.flip-card {
  perspective: 1500px;
  min-height: 240px;
  width: 200px;
  position: relative;
  z-index: 1;
}
```

**Key Properties:**
- `perspective: 1500px` - Creates 3D space for transform
- `min-height: 240px` - Sufficient height for image (96px) + title + artist without overlap
- `width: 200px` - Wide enough to display all content comfortably
- `position: relative` - Enables z-index control

### Flipped State

```css
.flip-card.flipped {
  z-index: 1000;
}

.flip-card.flipped .flip-card-inner {
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25))
          drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
}
```

**Key Properties:**
- `z-index: 1000` - Brings card to front, above all other cards
- Layered `drop-shadow` - Creates depth with multiple shadow layers for 3D effect
- **No scaling** - Card remains at natural size for better UX (per user feedback: "scaling is ugly")

### Inner Container

```css
.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 240px;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.flip-card.flipped .flip-card-inner {
  transform: rotateY(180deg);
}
```

**Key Properties:**
- `transform-style: preserve-3d` - Maintains 3D positioning of children
- `transition: transform 0.6s` - 0.6 second flip animation
- `rotateY(180deg)` - Rotates 180° around Y-axis when flipped

### Card Faces

```css
.flip-card-front,
.flip-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  min-height: 240px;
  /* CRITICAL: Hide back face to prevent text bleed-through */
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  -moz-backface-visibility: hidden;
  /* Make cards fully opaque with solid background */
  background-color: #FFF8F0; /* warmBg-primary */
  /* Ensure proper rendering */
  transform-style: preserve-3d;
}
```

**Key Properties:**
- `position: absolute` - Overlays faces in same space
- `backface-visibility: hidden` - **Critical for preventing text bleed-through**
- Vendor prefixes (`-webkit-`, `-moz-`) - Browser compatibility
- `background-color` - Solid opaque background
- `transform-style: preserve-3d` - Maintains 3D context

### Front Face

```css
.flip-card-front {
  z-index: 2;
  transform: rotateY(0deg);
  border: 1px solid #E5D4BC; /* Subtle border for definition */
  border-radius: 8px;
}
```

**Key Properties:**
- `z-index: 2` - Front face appears above back face initially
- `transform: rotateY(0deg)` - Explicit starting position
- `border` - Subtle 1px border for card definition
- `border-radius` - Rounded corners for polish

### Back Face

```css
.flip-card-back {
  transform: rotateY(180deg);
  background-color: #F5E6D3; /* warmBg-secondary */
  opacity: 1; /* Explicitly opaque */
  border: 2px solid #C9A876; /* Bronze border for emphasis */
  border-radius: 8px;
  overflow: visible;
}
```

**Key Properties:**
- `transform: rotateY(180deg)` - Starts rotated 180°, faces correct direction when flipped
- `opacity: 1` - Explicitly fully opaque (no transparency)
- `border: 2px solid #C9A876` - Thicker bronze border for 3D depth
- `overflow: visible` - Allows content to flow naturally
- Component handles internal padding (not CSS)

## React Component Implementation

### Component Structure

```tsx
// components/records/RecordCard.tsx
export default function RecordCard({ record }: RecordCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div
      className={`flip-card cursor-pointer ${isFlipped ? "flipped" : ""}`}
      onClick={handleCardClick}
    >
      <div className="flip-card-inner">
        <div className="flip-card-front">
          {/* Album art and basic info */}
        </div>
        <div className="flip-card-back">
          {/* Detailed information */}
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
    ↓
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
background-color: #FFF8F0; /* Solid color, not transparent */
```

**Preserve 3D:**
```css
transform-style: preserve-3d; /* Maintains 3D positioning */
```

## Visual Depth Without Scaling

### Why No Scaling?

**User feedback:** "Scaling is ugly" - scaling creates jarring UX

When the card flips to show detailed information:
- Card is already sized appropriately (200px × 240px)
- Scaling creates abrupt, disorienting visual changes
- Natural sizing provides smoother, more professional experience

**Solution:** Use border and layered shadows for 3D depth instead of scaling

### Implementation

```css
.flip-card.flipped {
  z-index: 1000;
}

.flip-card.flipped .flip-card-inner {
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.25))
          drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));
}
```

### Z-Index Elevation

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
- Maintains layering without scale transform

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
  border: 2px solid #C9A876; /* Bronze */
}
```

**Bronze border benefits:**
- Defines card edges clearly
- Complements warm color palette
- Adds tactile, physical appearance
- Thicker (2px) than front border (1px) for emphasis

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

**Appropriate Card Size:**
```css
min-height: 240px; /* Enough space for image + text without overlap */
width: 200px; /* Wide enough for all content */
```

**Natural Content Flow:**
```css
.flip-card-back {
  overflow: visible; /* Content flows naturally */
}
```

### Layout in Grid

Cards are displayed in a grid layout:

```tsx
// components/records/RecordShelf.tsx
<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
  {records.map((record) => (
    <RecordCard key={record.recordId} record={record} />
  ))}
</div>
```

**Responsive columns:**
- Mobile: 2 columns
- Tablet: 4 columns
- Desktop: 6 columns

**Gap spacing:**
- `gap-4` (1rem) provides space for scaled cards

## Common Issues and Solutions

### Issue: Text Shows Through in Reverse

**Symptom:** Back face text visible (reversed) when viewing front

**Solution:**
```css
backface-visibility: hidden;
-webkit-backface-visibility: hidden;
-moz-backface-visibility: hidden;
```

### Issue: Cards Overlap When Scaled

**Symptom:** Scaled card hidden behind adjacent cards

**Solution:**
```css
.flip-card.flipped {
  z-index: 1000; /* Bring to front */
}
```

### Issue: No 3D Effect

**Symptom:** Card rotates flat, no perspective

**Solution:**
```css
.flip-card {
  perspective: 1500px; /* Add 3D perspective */
}

.flip-card-inner {
  transform-style: preserve-3d; /* Maintain 3D context */
}
```

### Issue: Text Too Small on Card

**Symptom:** Hard to read text on front or back

**Solution:**
```css
/* Increase card size, not scale */
.flip-card {
  min-height: 240px;
  width: 200px;
}
```

```tsx
/* Use appropriate text sizes */
<p className="text-xs">Artist Name</p> /* Not text-[10px] */
```

**Why:** Natural sizing is better UX than scaling. Make cards appropriately sized from the start.

### Issue: Cards Overlap Other Content

**Symptom:** Artist text on front covered by card below

**Solution:**
```css
.flip-card {
  min-height: 240px; /* Sufficient for 96px image + text */
}
```

**Calculation:** 96px image + ~36px title (2 lines) + ~18px artist + ~30px spacing = ~240px

## Browser Compatibility

### Modern Browsers

Full support in:
- ✅ Chrome 36+
- ✅ Firefox 16+
- ✅ Safari 9+
- ✅ Edge 12+

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
- `transform` - No reflow, GPU accelerated ✅
- `z-index` - No reflow when changed ✅
- `opacity` - No reflow, GPU accelerated ✅

Avoid animating:
- `width`/`height` - Triggers reflow ❌
- `top`/`left` - Triggers reflow ❌

## Future Enhancements

Potential improvements:

- **Double-Click to Flip**: Prevent accidental flips
- **Keyboard Navigation**: Flip with Space/Enter
- **Gesture Support**: Swipe to flip on mobile
- **Auto-Flip Back**: Return to front after delay
- **Flip Direction**: Randomize flip axis for variety
- **Accessibility**: Announce content changes to screen readers

## Related Documentation

- [RecordCard Component](../components/record-card.md) (future)
- [Component Architecture](../components/README.md)
- [Tailwind Configuration](../development/tailwind-config.md) (future)
