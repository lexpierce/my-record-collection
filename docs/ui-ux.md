# UI/UX reference

## Color tokens

Source: `styles/_variables.scss`

| Token | Value | Role |
|-------|-------|------|
| `--warm-bg-primary` | `#1A1F1A` | Page background |
| `--warm-bg-secondary` | `#1E2419` | Card back, elevated surfaces |
| `--warm-bg-tertiary` | `#252C23` | Borders, subtle separators |
| `--warm-accent-primary` | `#8BA87A` | Primary buttons, active |
| `--warm-accent-secondary` | `#7A9469` | Button hover |
| `--warm-accent-tertiary` | `#A0B88E` | Highlights |
| `--warm-accent-muted` | `#6B8560` | Muted accents |
| `--warm-text-primary` | `#E8E0D0` | Body text |
| `--warm-text-secondary` | `#B8B0A0` | Labels, metadata |
| `--warm-text-muted` | `#888070` | Placeholder, disabled |
| `--warm-border` | `#2E3A2C` | Input borders, dividers |
| `--font-inter` | CSS var | Inter via `next/font/google` |

Warm olive/sage on near-black. No pure whites, no blues/reds.

## Layout

- Header/search/sync: `max-width: 80rem`, centered
- Record grid: full viewport width, `grid-template-columns: repeat(auto-fill, 180px)`, no breakpoints
- No `border-radius` anywhere
- No `overflow-x: clip` on grid ancestors

## Typography

| Element | Size |
|---------|------|
| Card title | `0.75rem` bold |
| Card artist | `0.75rem` |
| Metadata | `0.625rem` |
| Body | `0.875rem` |

## Interactions

| Action | Behavior |
|--------|----------|
| Click card | Flip (3D transform, 0.6s) |
| Click flipped card | Flip back |
| Hover card | `translateY(-2px)` |
| Sync button | Shows "Syncing..." + progress bar, shelf re-fetches on done |
| "+ Add an album" | Slides open search section |
| Search result "+ Add" | `POST fetch-from-discogs`, toast (3s), shelf re-fetches |

## No full-page reloads

All mutations use callback pattern (`onRecordMutated` / `onRecordAdded` → `refreshKey` bump).

## Responsive

Initial page size: 50 desktop (>640px), 25 mobile. Grid auto-fills. Header wraps via flexbox.

## Styling architecture

- `styles/globals.scss`: reset, variables, flip-card CSS, album-art size utilities
- `*.module.scss`: scoped per component
- No Tailwind
