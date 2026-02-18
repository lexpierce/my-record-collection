# UI / UX Patterns

Design conventions and interaction patterns used in this application.

## Color Palette

All colors are defined as CSS custom properties in `styles/_variables.scss`.

| Variable | Value | Role |
|---|---|---|
| `--warm-bg-primary` | `#1A1F1A` | Page background |
| `--warm-bg-secondary` | `#1E2419` | Card back, elevated surfaces |
| `--warm-bg-tertiary` | `#252C23` | Borders, subtle separators |
| `--warm-accent-primary` | `#8BA87A` | Primary buttons, active states |
| `--warm-accent-secondary` | `#7A9469` | Button hover states |
| `--warm-accent-tertiary` | `#A0B88E` | Highlights |
| `--warm-accent-muted` | `#6B8560` | Muted accents |
| `--warm-text-primary` | `#E8E0D0` | Body text |
| `--warm-text-secondary` | `#B8B0A0` | Labels, metadata |
| `--warm-text-muted` | `#888070` | Placeholder, disabled |
| `--warm-border` | `#2E3A2C` | Input borders, dividers |
| `--font-inter` | CSS variable | Inter font via Next.js font loader |

The palette is warm olive/sage greens on a near-black background. No pure whites or harsh blues.

## Typography

- **Font**: Inter (loaded via `next/font/google`, exposed as `--font-inter`)
- **Title (front card)**: `0.75rem bold` — fits within 180px card width
- **Artist (front card)**: `0.75rem`
- **Metadata labels/values (back card)**: `0.625rem` (10px) — dense but legible
- **Headings**: `page.module.scss` uses `--warm-text-primary` and larger sizes for the header

## Layout

- **Max width**: `80rem` — all sections centered with `max-width: 80rem; margin: 0 auto`
- **Record grid**: `grid-template-columns: repeat(auto-fill, 180px)` — no breakpoints, reflows automatically
- **No border-radius anywhere** — sharp edges throughout for a retro aesthetic

## Interaction Patterns

### Flip Card

- Click card → flip to back (3D CSS transform)
- Click again → flip back to front
- Card expands from 180px to 250px on flip for larger thumbnail
- Viewport-edge detection shifts expansion to stay within bounds
- See [Flip Card Animation](./features/flip-card-animation.md) for full details

### Sync Button

- Click → button shows "Syncing..." (disabled)
- Progress bar animates during pull phase
- Errors shown below progress bar (up to 5, with overflow count)
- When done: shelf re-fetches without full-page reload

### Add Album Flow

1. Click "+ Add an album" → search section slides into view
2. Pick search tab, fill fields, press Search (Discogs logo icon)
3. Spinner on button while searching
4. Results list with metadata and "+ Add" button per item
5. Success toast (3 s) after add; shelf re-fetches automatically

### Filter Dropdown

- Filter icon button with badge showing active filter count
- Dropdown appears below button (not modal)
- Size checkboxes derived from actual records in collection
- "Clear filters" button appears when any filter is active

## No Full-Page Reloads

The app avoids `window.location.reload()` for all user-triggered actions:
- After sync: bumps `refreshKey` → RecordShelf re-fetches
- After adding a record: `onRecordAdded` callback → `refreshKey` bumps

> **Exception**: `RecordCard` update/delete still calls `window.location.reload()`. This is a known limitation — the component doesn't have access to the shelf's `refreshKey` setter. See [TODO.md](./TODO.md).

## Accessibility

- Buttons have descriptive labels or `title` attributes
- Images have `alt` text
- Form inputs have `<label>` elements
- Sort direction button uses `title` for screen readers ("Ascending" / "Descending")

No ARIA roles have been audited yet. See [TODO.md](./TODO.md).

## Responsive Design

- Grid auto-fills at any width — no breakpoints needed
- Header actions stack naturally on narrow screens (flex-wrap)
- Controls bar uses flex with wrapping

## Styling Architecture

- **Global styles**: `styles/globals.scss` — reset, variables, flip-card CSS, album-art size utilities
- **Component styles**: `*.module.scss` per component — all scoped, no conflicts
- **No Tailwind** — the project was migrated away from Tailwind. All utility-style classes are in CSS modules or globals.

## Related

- [Flip Card Animation](./features/flip-card-animation.md)
- [RecordCard Component](./components/record-card.md)
- [RecordShelf Component](./components/record-shelf.md)
- [SearchBar Component](./components/search-bar.md)
