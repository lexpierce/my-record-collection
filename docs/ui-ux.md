# UI/UX reference

## Color tokens

Source: `styles/_variables.scss`. Colorscheme: warm green.

Semantic tokens map to warm green palette constants. Never hardcode hex in module files — always use semantic tokens.

| Token | Palette var | Hex | Role |
|-------|-------------|-----|------|
| `--warm-bg-primary` | `--green-card` | `#f2f8df` | Card fronts and elevated surfaces |
| `--warm-bg-secondary` | `--green-sage` | `#c7d8a7` | Page background |
| `--warm-bg-tertiary` | `--green-border` | `#88a85f` | Borders, contrast separators |
| `--warm-bg-card-back` | `--green-card-back` | `#dfeec2` | Card backs |
| `--warm-accent-orange` | `--green-copper` | `#6f8d2a` | Secondary buttons |
| `--warm-accent-copper` | `--green-olive` | `#496f25` | Hover states, links |
| `--warm-accent-bronze` | `--green-moss` | `#284f16` | Primary buttons, active, dividers |
| `--warm-accent-gold` | `--green-gold` | `#94a933` | Highlights |
| `--warm-text-primary` | `--green-text` | `#17350d` | Body text |
| `--warm-text-secondary` | `--green-muted` | `#3f612c` | Labels, metadata |
| `--warm-text-tertiary` | `--green-soft` | `#5f7f47` | Placeholder, disabled |
| `--font-sans` | — | — | Orkney, then browser `sans-serif` |
| `--font-mono` | — | — | Browser `ui-monospace`, `monospace` fallback |

## Font loading

Orkney is self-hosted from `public/fonts/` and loaded through `styles/_fonts.scss`. The app uses Orkney through `--font-sans` and browser/system monospace through `--font-mono`.

## Layout

- Header/search/sync: `max-width: 80rem`, centered
- Record grid: full viewport width, `grid-template-columns: repeat(auto-fill, 237px)` with `5px` gaps, no breakpoints
- Card faces use `16px` corner radius
- No `overflow-x: clip` on grid ancestors

## Typography

Optically center control text by ignoring descenders: use `line-height: 1` and larger top padding than bottom padding on buttons and selects.

| Element | Size | Font |
|---------|------|------|
| Page header title | `2rem` bold | Orkney |
| Body / buttons / inputs | `1rem` | Orkney |
| Card title (front + back) | `1rem` bold | Orkney |
| Card artist (front) | `1rem` | Orkney |
| Dense metadata (back of card) | `0.9375rem` | Orkney |
| Cat#, Year, Discogs ID values | `0.9375rem` | Browser monospace |
| AlphaNav buttons | `0.875rem` | Orkney |
| Page info / pagination | `0.9375rem` | Orkney |
| Filter badge | `10px` | Orkney |

## Interactions

| Action | Behavior |
|--------|----------|
| Click card | Flip (3D transform, 0.6s) |
| Click flipped card | Flip back |
| Hover card | `translateY(-2px)` |
| Sync button | Shows "Syncing..." + progress bar, shelf re-fetches on done |
| "+ Add an album" | Slides open search section |
| Search result "+ Add" | `POST fetch-from-discogs`, shelf re-fetches |

## No full-page reloads

All mutations refresh app state through browser scripts and API calls.

## Responsive

Grid auto-fills 237px columns with 5px gaps. Header wraps via flexbox.

## Styling architecture

- `styles/_fonts.scss`: Orkney `@font-face` declarations
- `styles/_variables.scss`: CSS custom property tokens
- `src/styles/globals.scss`: reset, flip-card CSS, album-art size utilities
- `src/styles/record-app.scss`: app UI styles
- No Tailwind
