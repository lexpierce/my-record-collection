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

### Tailwind Utilities

Use Tailwind for all styling:

```tsx
<div className="flex flex-col items-center gap-2 p-4">
  {/* content */}
</div>
```

### Custom Utilities

Define in `globals.css` only when needed:

```css
@layer utilities {
  .flip-card {
    perspective: 1500px;
    min-height: 160px;
  }
}
```

### Warm Color Palette

Use custom colors from `tailwind.config.ts`:

```tsx
<div className="bg-warmBg-primary text-warmText-primary">
  {/* content */}
</div>
```

### Font Application

Apply custom fonts globally via the `body` element:

```css
@layer base {
  :root {
    --font-inter: 'Inter', system-ui, sans-serif;
  }

  body {
    font-family: var(--font-inter);
  }
}
```

**Why**: Applying fonts at the body level ensures consistency across the entire application without needing to specify font-family on each component.

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

### CSS Layout Anti-Patterns

Avoid complex flex layouts that hide content:

```tsx
// ❌ Bad: h-full + justify-between hides content
<div className="h-full flex flex-col justify-between">
  <div className="flex-1 overflow-y-auto max-h-[calc(100%-60px)]">
    {/* Content gets hidden by constraints */}
  </div>
  <div className="mt-3">
    {/* Buttons */}
  </div>
</div>

// ✅ Good: Simple flex flow lets content be visible
<div className="flex flex-col space-y-2">
  <div className="space-y-1">
    {/* Content flows naturally */}
  </div>
  <div className="mt-2">
    {/* Buttons */}
  </div>
</div>
```

**Common issues**:
- `h-full` + `justify-between` creates rigid spacing that hides overflow content
- `flex-1` + `max-h-[calc(...)]` creates height constraints that clip content
- Double overflow handling (CSS `overflow-y: auto` + component `overflow-y-auto`) conflicts

**Solution**: Use simple flex layouts with natural spacing (`space-y-*`, `gap-*`). Let content determine size, not arbitrary constraints.

### Button Sizing

Never use `flex-1` on buttons:

```tsx
// ❌ Bad: flex-1 makes buttons huge
<button className="flex-1 px-2 py-1 text-xs">
  Update from Discogs
</button>

// ✅ Good: Natural sizing with whitespace-nowrap
<button className="px-2 py-1 text-xs whitespace-nowrap">
  Update
</button>
```

**Why**: `flex-1` causes buttons to grow and fill available space, creating oversized buttons that dominate the UI. Use natural sizing with shorter labels and `whitespace-nowrap` to keep buttons compact.

### Border Radius

All elements use `border-radius: 0px` (sharp edges). Do not use Tailwind `rounded` classes.

### Text Size Guidelines

**Sizes in use**:
- **Card front titles**: `text-[11px]` with `leading-tight` and `truncate`
- **Card front artist**: `text-[11px]` with `leading-tight` and `truncate`
- **Card back titles**: `text-xs` (12px)
- **Dense information cards** (detailed metadata): `text-[10px]`
- **Body text**: `text-sm` (14px) or larger

```tsx
// ✅ Good: Front card title with truncation
<h3 className="text-[11px] font-semibold text-warmText-primary truncate leading-tight">
  {record.albumTitle}
</h3>

// ✅ Good: Dense metadata on back card
<span className="text-[10px]">{record.yearReleased}</span>
```

**Rationale**: `text-[11px]` balances readability with space on card fronts. `text-[10px]` is acceptable for dense metadata on the back card.

### Grid Layout Spacing

Cards in grid layouts need sufficient `min-height` to prevent text overlap:

```css
/* ❌ Bad: Cards overlap, artist text covered */
.card {
  min-height: 160px;
  width: 120px;
}

/* ✅ Good: Sufficient height for image + text */
.card {
  min-height: 240px;
  width: 200px;
}
```

**Calculation**: For cards with 96px image + title (2 lines) + artist (1 line):
- Image: 96px
- Title: ~36px (2 lines at 18px line-height)
- Artist: ~18px (1 line)
- Spacing: ~30px (margins/padding)
- **Total: ~240px minimum**

**Why**: Insufficient `min-height` causes text to extend beyond card bounds and overlap with cards in the next row.

## File Organization

```
app/
├── api/              # API routes
│   └── */route.ts    # Each route in its own directory
├── page.tsx          # Main page
└── globals.css       # Global styles

components/
└── */                # Organized by feature
    └── *.tsx

lib/
├── db/               # Database client and schema
└── */                # External API clients
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
