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
