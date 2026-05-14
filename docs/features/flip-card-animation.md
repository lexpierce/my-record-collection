# Flip card animation

CSS 3D flip card. Source: `src/styles/globals.scss`, `src/styles/record-app.scss`, `src/scripts/record-app.ts`.

## CSS structure

```text
.flip-card              → perspective: 1500px, width: 237px, z-index: 1
  .flip-card-inner      → transform-style: preserve-3d, transition: transform 0.6s
    .flip-card-front    → position: relative, backface-visibility: hidden
    .flip-card-back     → position: absolute, transform: rotateY(180deg), backface-visibility: hidden
```

## Flipped state (`.flip-card.flipped`)

- `.flip-card-inner`: `transform: rotateY(180deg)`
- `.flip-card`: `z-index: 1000`, `width: 347px`
- `filter: drop-shadow(...)` on `.flip-card` outer container
- JS sets asymmetric margins from `FLIPPED_CARD_EXTRA_WIDTH` to keep the expanded card in the viewport

## Rules

| Rule | Effect of violation |
|------|---------------------|
| `transform-style: preserve-3d` only on `.flip-card-inner` | On faces: `backface-visibility` stops working |
| `filter` only on `.flip-card`, never `.flip-card-inner` | Flattens 3D context |
| `.flip-card-back { height: auto }` | `height: 100%` clips content |
| No `overflow-x: clip` on grid ancestors | Clips both axes |
| No `transform: scale()` on cards | Enlarges text without reflowing layout |

## Width expansion

237px → 347px on flip. JS in `src/scripts/record-app.ts` adjusts margins at viewport edges via `getBoundingClientRect()`.

## Font sizes

Front/back title, artist, metadata, and card buttons: `1.3125rem`.

## Hover

`.flip-card:hover:not(.flipped)` → `translateY(-2px)`.
