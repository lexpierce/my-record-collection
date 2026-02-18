# Coding Standards

Development standards and patterns for the My Record Collection project.

## General Principles

### Verbose Naming

Use descriptive, self-documenting names:

```typescript
// ✅ Good
const handleUpdateFromDiscogs = async () => { ... }
const vinylColorDescription = extractVinylColor(formats);

// ❌ Bad
const update = async () => { ... }
const color = extract(formats);
```

### Inline Comments

Add comments explaining *why* and *how*, not *what*:

```typescript
// ✅ Good: Explains reasoning
// Use text type to preserve non-ASCII characters like Björk, Motörhead
artistName: text("artist_name").notNull(),

// ❌ Bad: States the obvious
// This is the artist name field
artistName: text("artist_name").notNull(),
```

### TypeScript Strict Mode

Leverage TypeScript fully:

```typescript
// ✅ Good: Fully typed
interface RecordCardProps {
  record: Record;
}

// ❌ Bad: Any types
interface RecordCardProps {
  record: any;
}
```

## Component Patterns

### Client vs Server Components

Mark interactive components with `"use client"`:

```typescript
"use client"; // At top of file

import { useState } from "react";

export default function RecordCard() {
  const [isFlipped, setIsFlipped] = useState(false);
  // ...
}
```

### Props Interfaces

Define interfaces above components:

```typescript
interface RecordCardProps {
  record: Record;
}

export default function RecordCard({ record }: RecordCardProps) {
  // ...
}
```

### Handler Functions

Define handlers before return statement:

```typescript
export default function RecordCard({ record }: RecordCardProps) {
  const [state, setState] = useState(false);

  const handleClick = () => {
    setState(!state);
  };

  return (
    <div onClick={handleClick}>
      {/* JSX */}
    </div>
  );
}
```

## Database Patterns

### Text Type for Non-ASCII

Always use `text` for artist/title fields:

```typescript
// ✅ Preserves Björk, Motörhead, etc.
artistName: text("artist_name").notNull(),

// ❌ May have encoding issues
artistName: varchar("artist_name", { length: 255 }).notNull(),
```

### UUID Primary Keys

Use UUID for all table primary keys:

```typescript
recordId: uuid("record_id").primaryKey().defaultRandom(),
```

### Timestamps

Include created/updated timestamps:

```typescript
createdAt: timestamp("created_at").defaultNow().notNull(),
updatedAt: timestamp("updated_at").defaultNow().notNull(),
```

## API Patterns

### Error Handling

Consistent error responses:

```typescript
try {
  // ... operation
} catch (error) {
  console.error("Error description:", error);
  return NextResponse.json(
    {
      error: "Error type",
      message: error instanceof Error ? error.message : "Unknown error",
    },
    { status: 500 }
  );
}
```

### Rate Limiting

Use token bucket for external APIs:

```typescript
class RateLimiter {
  private lastRequestTime: number = 0;
  private readonly minimumDelayMilliseconds: number;

  async waitForNextRequest(): Promise<void> {
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.minimumDelayMilliseconds) {
      await new Promise(resolve => setTimeout(resolve, delayNeeded));
    }
    this.lastRequestTime = Date.now();
  }
}
```

### Response Format

Consistent JSON structure:

```typescript
// Success
return NextResponse.json({
  data: result,
  message: "Operation successful"
}, { status: 200 });

// Error
return NextResponse.json({
  error: "Error type",
  message: "Detailed message"
}, { status: 400 });
```

## Styling Patterns

### Sass CSS Modules

Every component has a co-located `.module.scss` file. Import and reference via the `styles` object:

```tsx
import styles from "./RecordCard.module.scss";

<div className={styles.card}>
  {/* content */}
</div>
```

Conditional classes use template literals:

```tsx
<div className={`${styles.filterBtn}${isActive ? ` ${styles.active}` : ""}`}>
```

### Global styles

Three layers, in `styles/`:

| File | Purpose |
|------|---------|
| `_variables.scss` | CSS custom properties (color tokens, font) |
| `_reset.scss` | `box-sizing`, `scroll-behavior`, `body` font |
| `_animations.scss` | `@keyframes` (e.g. `spin`) |
| `globals.scss` | `@use` all partials + global classes that JS toggles by string (flip-card, album-art-size) |

Import once in `app/layout.tsx`:

```tsx
import "@/styles/globals.scss";
```

### Warm color palette

All color tokens are CSS custom properties defined in `styles/_variables.scss`. Reference them everywhere via `var(--token)`:

```scss
// styles/_variables.scss
:root {
  --warm-bg-primary:   #F7F9F2;
  --warm-accent-bronze: #3E5C2F;
  --warm-text-primary:  #2F3327;
  // ...
}
```

```scss
// In a .module.scss
.card {
  background-color: var(--warm-bg-primary);
  color: var(--warm-text-primary);
}
```

Do not hardcode hex values in component modules — always use the token.

### Font application

Font is set via CSS custom property from Next.js font variable, applied in `layout.module.scss`:

```scss
.body {
  font-family: var(--font-sans); // resolves to var(--font-inter) via _variables.scss
}
```

**Why**: Applying font at the body level ensures consistency without per-component repetition.

### When to use global vs module classes

Use **global classes** (in `globals.scss`) only when JavaScript toggles the class by string at runtime:

```tsx
// RecordCard.tsx — JS toggles "flipped" string, must be global
<div className={`flip-card${isFlipped ? " flipped" : ""}`}>
```

Everything else belongs in a `.module.scss`.

### CSS 3D Transform Anti-Patterns

These rules prevent silent breakage of CSS 3D flip animations:

**Never put `transform-style: preserve-3d` on card faces:**
```css
/* WRONG */
.flip-card-front, .flip-card-back {
  transform-style: preserve-3d;
}

/* CORRECT - only on inner container */
.flip-card-inner {
  transform-style: preserve-3d;
}
```
Creates nested 3D contexts that break `backface-visibility: hidden`.

**Never put `filter` on an element with `preserve-3d`:**
```css
/* WRONG - flattens 3D transforms */
.flip-card.flipped .flip-card-inner {
  filter: drop-shadow(...);
}

/* CORRECT - put on outer container */
.flip-card.flipped {
  filter: drop-shadow(...);
}
```
CSS `filter` flattens 3D transforms on the element, destroying the 3D context entirely.

**Use `height: auto` on back face for full background coverage:**
```css
/* WRONG - bg stops at 240px, content overflows transparently */
.flip-card-back { height: 100%; overflow: visible; }

/* CORRECT - bg grows with content */
.flip-card-back { height: auto; }
```

See [Flip Card Animation](../features/flip-card-animation.md) for full details.

**Never use `overflow-x: clip` (or `overflow: clip`) on any ancestor of the flip card grid:**

```scss
// ❌ Bad: clips BOTH axes — rightmost cards are truncated vertically and
//         the expanded flipped card (180px → 250px) is cut off horizontally
.shelfSection {
  overflow-x: clip;
}

// ✅ Good: no clipping needed — RecordCard JS adjusts margins dynamically
//         to keep flipped cards within the viewport
.shelfSection {
  // no overflow rule
}
```

CSS `overflow-x: clip` implicitly clips the y-axis too in most browsers (per spec, setting one axis to a value other than `visible` forces the other axis). This causes the rightmost grid column to be vertically truncated even before any flip occurs.

### CSS layout anti-patterns

Avoid layouts that constrain height and clip content:

```scss
// ❌ Bad: fixed height + justify-between hides overflow content
.card {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

// ✅ Good: natural flow, content determines height
.card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
```

**Common issues**:
- `height: 100%` + `justify-content: space-between` creates rigid spacing that clips overflow
- `flex: 1` + `max-height: calc(...)` introduces height constraints that hide content
- Double overflow handling (`overflow-y: auto` at two levels) causes conflicts

**Solution**: Let content determine size. Use `gap` and `margin` for spacing.

### Button sizing

Never use `flex: 1` on buttons:

```scss
// ❌ Bad: flex-grow fills container, creates oversized button
.btn { flex: 1; }

// ✅ Good: natural sizing
.btn {
  padding: 0.25rem 0.5rem;
  white-space: nowrap;
}
```

### Border radius

All elements use `border-radius: 0` (sharp edges). Do not add `border-radius` anywhere.

### Text size guidelines

**Sizes in use**:
- **Card titles (front AND back)**: `0.75rem` bold with `text-overflow: ellipsis` — matched on both faces
- **Card artist (front AND back)**: `0.75rem` with ellipsis
- **Dense metadata** (back card details): `0.625rem` (10px)
- **Body text**: `0.875rem` (14px) or larger

**Rationale**: 12px balances readability with card space. Bold titles distinguish from artist names. Matching front/back sizes keeps the flip transition visually consistent.

### Card sizing

Cards use **content-driven height** — NO min-height. The front face uses `position: relative` to set natural height; the back face uses `position: absolute` to overlay.

```scss
// ❌ Bad: fixed min-height creates whitespace
.flipCard { min-height: 240px; }

// ✅ Good: content determines height
.flipCardFront { position: relative; }
.flipCardBack  { position: absolute; top: 0; left: 0; }
```

**Current card dimensions**:
- Card width: 180px (250px when flipped)
- Album art front: 144px × 144px (`.album-art-size` global class)
- Album art back: 216px × 216px (`.album-art-size-lg` global class)
- Grid column gap: `1.25rem`, row gap: `0`

## File Organization

```
app/
├── api/                    # API routes
│   └── */route.ts          # Each route in its own directory
├── layout.tsx              # Root layout
├── layout.module.scss      # Layout-scoped styles
├── page.tsx                # Main page
└── page.module.scss        # Page-scoped styles

components/
└── records/                # Organized by feature
    ├── RecordCard.tsx
    ├── RecordCard.module.scss
    ├── RecordShelf.tsx
    ├── RecordShelf.module.scss
    ├── SearchBar.tsx
    └── SearchBar.module.scss

styles/
├── _variables.scss         # CSS custom properties (color tokens, font)
├── _reset.scss             # Base reset (box-sizing, scroll-behavior)
├── _animations.scss        # @keyframes
└── globals.scss            # @use partials + global classes (flip-card, album-art-size)

lib/
├── db/                     # Database client and schema
└── */                      # External API clients
    └── client.ts
```

## Commit Messages

Follow conventional commits:

```
feat: Add vinyl color extraction to search results
fix: Prevent text bleed-through on flip cards
docs: Document flip card animation implementation
chore: Update dependencies

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## Testing

Run checks before committing:

```bash
bun run type-check  # TypeScript errors
bun run lint        # ESLint
bun run build       # Production build
```
