# UI/UX reference

## Color tokens

Source: `styles/_variables.scss`. Colorscheme: warm green.

Semantic tokens map to warm green palette constants. Never hardcode hex in module files — always use semantic tokens.

| Token | Palette var | Hex | Role |
|-------|-------------|-----|------|
| `--warm-bg-primary` | `--green-card` | `#fffaf0` | Card fronts and elevated surfaces |
| `--warm-bg-secondary` | `--green-sage` | `#d8dbc1` | Page background |
| `--warm-bg-tertiary` | `--green-border` | `#a9ad7e` | Borders, contrast separators |
| `--warm-bg-card-back` | `--green-card-back` | `#eef0d7` | Card backs |
| `--warm-accent-orange` | `--green-copper` | `#b86b2d` | Secondary buttons |
| `--warm-accent-copper` | `--green-olive` | `#596b2f` | Hover states, links |
| `--warm-accent-bronze` | `--green-moss` | `#3d5424` | Primary buttons, active, dividers |
| `--warm-accent-gold` | `--green-gold` | `#c0922c` | Highlights |
| `--warm-text-primary` | `--green-text` | `#213018` | Body text |
| `--warm-text-secondary` | `--green-muted` | `#516141` | Labels, metadata |
| `--warm-text-tertiary` | `--green-soft` | `#73805e` | Placeholder, disabled |
| `--font-sans` | — | — | Orkney, then browser `sans-serif` |
| `--font-mono` | — | — | Browser `ui-monospace`, `monospace` fallback |

## Font loading

Orkney is self-hosted from `public/fonts/` and loaded through `styles/_fonts.scss`. The app uses Orkney through `--font-sans` and browser/system monospace through `--font-mono`.

## Layout

- Header/search/sync: `max-width: 80rem`, centered
- Record grid: full viewport width, `grid-template-columns: repeat(auto-fill, 270px)` with `10px` gaps, no breakpoints
- Card faces use `4px` corner radius
- No `overflow-x: clip` on grid ancestors

## Typography

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

Grid auto-fills 270px columns with 10px gaps. Header wraps via flexbox.

## Styling architecture

- `styles/_fonts.scss`: Orkney `@font-face` declarations
- `styles/_variables.scss`: CSS custom property tokens
- `src/styles/globals.scss`: reset, flip-card CSS, album-art size utilities
- `src/styles/record-app.scss`: app UI styles
- No Tailwind
