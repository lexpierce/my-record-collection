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
| `--font-sans` | — | — | `"Input Sans"`, system-ui fallback |
| `--font-mono` | — | — | `"Input Mono"`, ui-monospace fallback |

## Font loading

Input Sans and Input Mono are declared via `@font-face` in `styles/globals.scss`, pointing to `public/fonts/`.
Download free for private use at <https://input.djr.com/download/>.
System-ui / ui-monospace serve as fallbacks until font files are placed.
Inter (`next/font/google`) is no longer used.

## Layout

- Header/search/sync: `max-width: 80rem`, centered
- Record grid: full viewport width, `grid-template-columns: repeat(auto-fill, 180px)`, no breakpoints
- No `border-radius` anywhere
- No `overflow-x: clip` on grid ancestors

## Typography

| Element | Size | Font |
|---------|------|------|
| Page header title | `2rem` bold | Input Sans |
| Body / buttons / inputs | `1rem` | Input Sans |
| Card title (front + back) | `0.875rem` bold | Input Sans |
| Card artist (front) | `0.875rem` | Input Sans |
| Dense metadata (back of card) | `0.875rem` | Input Sans |
| Cat#, Year, Discogs ID values | `0.875rem` | Input Mono |
| AlphaNav buttons | `0.875rem` | Input Sans |
| Page info / pagination | `0.9375rem` | Input Sans |
| Filter badge | `10px` | Input Sans |

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

All mutations use callback pattern (`onRecordMutated` / `onRecordAdded` → `refreshKey` bump).

## Responsive

Grid auto-fills 180px columns. Header wraps via flexbox.

## Styling architecture

- `styles/_variables.scss`: all CSS custom property tokens (Catppuccin Latte palette + semantic tokens + font vars)
- `styles/globals.scss`: `@font-face` declarations, reset, flip-card CSS, album-art size utilities
- `*.module.scss`: scoped per component
- No Tailwind
