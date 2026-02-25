# Flip card animation

CSS 3D flip card. Source: `styles/globals.scss`, `components/records/RecordCard.tsx`.

## CSS structure

```text
.flip-card              → perspective: 1500px, width: 180px, z-index: 1
  .flip-card-inner      → transform-style: preserve-3d, transition: transform 0.6s
    .flip-card-front    → position: relative, backface-visibility: hidden
    .flip-card-back     → position: absolute, transform: rotateY(180deg), backface-visibility: hidden
```

## Flipped state (`.flip-card.flipped`)

- `.flip-card-inner`: `transform: rotateY(180deg)`
- `.flip-card`: `z-index: 1000`, `width: 250px`, `margin-left: -35px`, `margin-right: -35px`
- `filter: drop-shadow(...)` on `.flip-card` (outer container)

## Rules (violations break the animation silently)

| Rule | Effect of violation |
|------|---------------------|
| `transform-style: preserve-3d` only on `.flip-card-inner` | On faces: `backface-visibility` stops working |
| `filter` only on `.flip-card`, never `.flip-card-inner` | Flattens 3D context |
| `.flip-card-back { height: auto }` | `height: 100%` clips content |
| No `overflow-x: clip` on grid ancestors | Clips both axes (CSS spec) |
| No `transform: scale()` on cards | Enlarges text, breaks layout |

## Width expansion

180px → 250px on flip. Negative margins center it. JS in `RecordCard.tsx` adjusts margins at viewport edges via `getBoundingClientRect()`.

## Font sizes

Front/back title: `0.75rem` bold. Artist: `0.75rem`. Metadata: `0.625rem`. No change on flip.

## Hover

`.flip-card:hover:not(.flipped)` → `translateY(-2px)`.

## Global vs module classes

`flip-card`, `flipped`, `flip-card-inner`, `flip-card-front`, `flip-card-back`, `album-art-size`, `album-art-size-lg` are in `styles/globals.scss` because JS toggles them by string. Everything else in `RecordCard.module.scss`.
