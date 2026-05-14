# Coding standards

Rules enforced across the codebase. Violations should be fixed immediately.

## General

### Naming

Use verbose, descriptive names. No abbreviations in TypeScript public code.

### Acronym casing

| Context | Correct | Wrong |
|---------|---------|-------|
| Local variable | `databaseURL`, `releaseID` | `databaseUrl`, `releaseId` |
| Private field | `baseURL` | `baseUrl` |

Drizzle schema fields use lowercase acronyms (`discogsId`, `thumbnailUrl`, `coverImageUrl`) because Drizzle's snake_case mapping produces that form.

### Verifying before deleting

Before removing any import, field, variable, or function: search references in `src/`, `lib/`, `__tests__/`, and `tui/`.

### Tool preferences

Use `rg` instead of `grep`. Use `fd` instead of `find`.

## TypeScript

See [TypeScript configuration](./typescript.md).

### Strict mode

Always fully typed. No `any`.

### Lazy database getter

Never export the Drizzle client at module level. Use `getDatabase()` from `lib/db/client.ts`.

### Astro API endpoints

Use standard `Request` and `Response` objects.

```ts
export async function GET({ request }: { request: Request }): Promise<Response> {
  const searchParams = new URL(request.url).searchParams;
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
```

Dynamic route params use Astro's `params` object.

```ts
export async function DELETE({ params }: { params: { id: string } }): Promise<Response> {
  return jsonResponse({ id: params.id });
}
```

### Dynamic Drizzle queries

Use `$dynamic()` for conditional `where()`.

```ts
let query = getDatabase().select().from(recordsTable).$dynamic();
const conditions = [];
if (sizeValues.length > 0) conditions.push(inArray(recordsTable.recordSize, sizeValues));
if (conditions.length > 0) query = query.where(and(...conditions));
```

Import all `drizzle-orm` operators at file top. Never use dynamic `import()`.

## Browser scripts

| Rule | Requirement |
|------|-------------|
| Location | Browser code lives in `src/scripts/` |
| Helpers | Pure logic and shared UI constants live in `src/scripts/record-helpers.ts` and have Vitest tests |
| DOM wiring | `src/scripts/record-app.ts` owns event listeners and rendering |
| Reloads | Do not use `window.location.reload()` |
| State | Keep state explicit and derive filtered/sorted/paged views from records |
| Accessibility | Interactive card roots use `role="button"`, `tabindex="0"`, `aria-expanded`, Enter/Space handlers |
| Images | Use standard `<img>` with explicit `alt`, `width`, and `height` |

## Styling

| Rule | Requirement |
|------|-------------|
| Tailwind | Forbidden |
| Tokens | All colors use semantic `--warm-*` custom properties from `styles/_variables.scss` |
| Raw palette | Do not use `--ctp-*` directly outside token/root contexts unless documenting token mappings |
| Border radius | `0` everywhere except spinner circles |
| Buttons | Never `flex: 1`; use padding and `white-space: nowrap` |
| Grid | `grid-template-columns: repeat(auto-fill, 270px)` |
| Card sizing | Update CSS, render image dimensions, JS flip constants, tests, and docs together |
| Overflow | No `overflow-x: clip` on grid ancestors |
| Fonts | Orkney is self-hosted in `public/fonts/` and declared in `styles/_fonts.scss`; no external runtime font CSS |

## Shared utility modules

Logic needed by both browser and server code lives in `lib/<domain>/` only if browser-safe. Server-only logic stays out of `src/scripts/`.

## Testing

Run before completion:

```bash
bun run lint
bun run lint:md
bun run type-check
bun run test
bun run build
```

## Go TUI

Go standards remain documented in `tui/README.md` and the Go source tests. Keep Go idioms separate from TypeScript naming rules.
