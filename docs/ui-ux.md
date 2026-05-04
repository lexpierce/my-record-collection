# UI/UX reference

## Color tokens

Source: `styles/_variables.scss`. Colorscheme: Catppuccin Latte.

Semantic tokens map to Catppuccin Latte palette constants (`--ctp-*`). Never hardcode hex in module files — always use semantic tokens.

| Token | Catppuccin var | Hex | Role |
|-------|---------------|-----|------|
| `--warm-bg-primary` | `--ctp-base` | `#eff1f5` | Page background |
| `--warm-bg-secondary` | `--ctp-mantle` | `#e6e9ef` | Card back, elevated surfaces |
| `--warm-bg-tertiary` | `--ctp-crust` | `#dce0e8` | Borders, subtle separators |
| `--warm-accent-orange` | `--ctp-peach` | `#fe640b` | Secondary buttons |
| `--warm-accent-copper` | `--ctp-sapphire` | `#209fb5` | Hover states, links |
| `--warm-accent-bronze` | `--ctp-blue` | `#1e66f5` | Primary buttons, active, dividers |
| `--warm-accent-gold` | `--ctp-yellow` | `#df8e1d` | Highlights |
| `--warm-text-primary` | `--ctp-text` | `#4c4f69` | Body text |
| `--warm-text-secondary` | `--ctp-subtext1` | `#5c5f77` | Labels, metadata |
| `--warm-text-tertiary` | `--ctp-subtext0` | `#6c6f85` | Placeholder, disabled |
| `--font-sans` | — | — | Browser `sans-serif` |
| `--font-mono` | — | — | Browser `ui-monospace`, `monospace` fallback |

## Font loading

No custom web fonts are loaded. The app uses browser/system fonts through `--font-sans` and `--font-mono`.

## Layout

- Header/search/sync: `max-width: 80rem`, centered
- Record grid: full viewport width, `grid-template-columns: repeat(auto-fill, 270px)`, no breakpoints
- No `border-radius` anywhere
- No `overflow-x: clip` on grid ancestors

## Typography

| Element | Size | Font |
|---------|------|------|
| Page header title | `2rem` bold | Browser sans-serif |
| Body / buttons / inputs | `1rem` | Browser sans-serif |
| Card title (front + back) | `1.3125rem` bold | Browser sans-serif |
| Card artist (front) | `1.3125rem` | Browser sans-serif |
| Dense metadata (back of card) | `1.3125rem` | Browser sans-serif |
| Cat#, Year, Discogs ID values | `1.3125rem` | Browser monospace |
| AlphaNav buttons | `0.875rem` | Browser sans-serif |
| Page info / pagination | `0.9375rem` | Browser sans-serif |
| Filter badge | `10px` | Browser sans-serif |

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

Grid auto-fills 270px columns. Header wraps via flexbox.

## Styling architecture

- `styles/_variables.scss`: CSS custom property tokens
- `src/styles/globals.scss`: reset, flip-card CSS, album-art size utilities
- `src/styles/record-app.scss`: app UI styles
- No Tailwind
