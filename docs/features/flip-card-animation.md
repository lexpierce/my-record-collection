# Flip Card Animation

Documentation for the 3D flip card animation implementation.

## Overview

The record cards use CSS 3D transforms to create a flip animation that reveals detailed information on the back. When flipped, the card scales up and elevates for better visibility.

## Key Features

- **3D Transform**: Realistic flip using CSS perspective and rotateY
- **No Text Bleed-Through**: Proper backface-visibility prevents reversed text from showing
- **Scale on Flip**: Card grows 2x when flipped for easier reading
- **Z-Index Elevation**: Flipped card appears above other cards
- **Drop Shadow**: Adds depth perception when flipped
- **Smooth Animation**: 0.6s transition for flip, 0.3s for scale

## CSS Implementation

### Container Setup

```css
/* app/globals.css */

.flip-card {
  perspective: 1500px;
  min-height: 160px;
  width: 120px;
  transition: transform 0.3s ease, z-index 0s;
  position: relative;
  z-index: 1;
}
```

**Key Properties:**
- `perspective: 1500px` - Creates 3D space for transform
- `min-height: 160px` - Prevents card overlap (space for image + text)
- `transition: transform 0.3s ease` - Smooth scale animation
- `position: relative` - Enables z-index control

### Flipped State

```css
.flip-card.flipped {
  transform: scale(2.0);
  z-index: 1000;
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
}
```

**Key Properties:**
- `transform: scale(2.0)` - Doubles card size when flipped
- `z-index: 1000` - Brings card to front, above all other cards
- `drop-shadow` - Adds depth and separation from other cards

### Inner Container

```css
.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 160px;
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
  min-height: 160px;
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
}
```

**Key Properties:**
- `z-index: 2` - Front face appears above back face initially
- `transform: rotateY(0deg)` - Explicit starting position

### Back Face

```css
.flip-card-back {
  transform: rotateY(180deg);
  background-color: #F5E6D3; /* warmBg-secondary */
  overflow-y: auto;
  padding: 8px;
}
```

**Key Properties:**
- `transform: rotateY(180deg)` - Starts rotated 180°, faces correct direction when flipped
- `overflow-y: auto` - Allows scrolling if content exceeds card height
- `padding: 8px` - Spacing for content readability

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

## Scale and Elevation on Flip

### Why Scale Up?

When the card flips to show detailed information:
- Text becomes harder to read at original size
- User's focus is on one specific card
- Surrounding cards are less important

**Solution:** Scale up 2x when flipped

### Implementation

```css
.flip-card.flipped {
  transform: scale(2.0);
  z-index: 1000;
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
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
- Prevents scaled card from being hidden behind neighboring cards
- Creates visual hierarchy (flipped card is "active")
- Allows card to grow without being clipped

### Drop Shadow

```css
filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
```

**Drop shadow properties:**
- `0` horizontal offset - Shadow directly below
- `10px` vertical offset - Shadow below card
- `20px` blur radius - Soft, diffused shadow
- `rgba(0, 0, 0, 0.3)` - 30% opacity black

**Purpose:**
- Adds depth perception
- Separates flipped card from background
- Enhances "floating" effect

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

### Scale Animation

```css
.flip-card {
  transition: transform 0.3s ease, z-index 0s;
}
```

- **Duration**: 0.3 seconds for scale, 0s for z-index
- **Easing**: Ease (gradual acceleration/deceleration)
- **Properties**: transform (scale) and z-index (instant)

**Why different durations:**
- Flip takes longer (0.6s) for dramatic effect
- Scale is quicker (0.3s) for responsive feel
- Z-index is instant (0s) to prevent z-fighting

## Responsive Behavior

### Mobile Considerations

The flip card works on mobile with these considerations:

**Click becomes Touch:**
```tsx
onClick={handleCardClick} // Works for both click and touch
```

**Larger Minimum Height:**
```css
min-height: 160px; /* Enough space for scaled content */
```

**Scrollable Back Face:**
```css
.flip-card-back {
  overflow-y: auto; /* Scroll if content too tall */
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

### Issue: Cards Too Small When Flipped

**Symptom:** Hard to read text on back

**Solution:**
```css
.flip-card.flipped {
  transform: scale(2.0); /* Scale up 2x */
}
```

### Issue: Cards Overlap Other Content

**Symptom:** Adjacent cards push into flipped card space

**Solution:**
```css
.flip-card {
  min-height: 160px; /* Reserve vertical space */
}
```

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
