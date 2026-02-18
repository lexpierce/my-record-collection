# Documentation Style Guide

This guide defines standards for writing and maintaining documentation in the My Record Collection project.

## Philosophy

- **Write for humans first**: Documentation should be clear, concise, and easy to scan
- **Code is the source of truth**: Docs should explain *why* and *how*, not duplicate what the code already shows
- **Keep docs close to code**: Documentation lives in the repository and follows the same review process
- **Maintain as you build**: Update docs in the same commit that changes behavior

## Directory Structure

```
docs/
├── STYLE_GUIDE.md          # This file
├── api/                    # API endpoint documentation
│   ├── README.md           # API overview and conventions
│   └── endpoints/          # Individual endpoint docs
├── components/             # Component usage and architecture
│   ├── README.md           # Component overview
│   └── *.md                # Individual component docs
├── features/               # Feature documentation
│   ├── README.md           # Feature overview
│   └── *.md                # Individual feature docs
├── development/            # Development guidelines
│   ├── README.md           # Development overview
│   └── *.md                # Specific guidelines
└── deployment/             # Deployment guides
    └── README.md           # Deployment overview
```

## Markdown Conventions

### Headers

- Use ATX-style headers (`#`, `##`, etc.) not underlined headers
- Start with `#` (H1) for document title
- Use sentence case for headers, not title case
- Skip only one level at a time (no H1 → H3)

```markdown
# Document Title

## Main Section

### Subsection

#### Detail Level
```

### Code Blocks

Always specify the language for syntax highlighting:

```markdown
```typescript
const example = "Use language identifiers";
```
```

Common language identifiers:
- `typescript` or `ts`
- `javascript` or `js`
- `bash` or `sh`
- `json`
- `yaml`
- `sql`

### Code Examples

**Good code examples:**
- Show complete, runnable code when possible
- Include relevant context (imports, types)
- Add inline comments for non-obvious logic
- Show both the code AND expected output

```typescript
// ✅ Good: Shows imports, types, and purpose
import { getDatabase, schema } from "@/lib/db/client";

/**
 * Fetches all records from the database
 * @returns Array of Record objects
 */
export async function getAllRecords() {
  return await getDatabase().select().from(schema.recordsTable);
}
```

```typescript
// ❌ Bad: No context, unclear purpose
export function get() {
  return db.select().from(table);
}
```

### Links

- Use relative links for internal documentation: `[API Docs](./api/README.md)`
- Use absolute URLs for external resources: `[Next.js Docs](https://nextjs.org/docs)`
- Always include descriptive link text (no "click here")

### Lists

- Use `-` for unordered lists (not `*` or `+`)
- Use `1.` for ordered lists (markdown auto-numbers)
- Indent nested lists with 2 spaces
- Add blank line before and after lists

### Emphasis

- Use `**bold**` for UI elements, filenames, and important terms
- Use `*italics*` sparingly, only for subtle emphasis
- Use `` `backticks` `` for code, commands, values, and technical terms

### Tables

Use tables for structured comparisons or reference data:

```markdown
| HTTP Method | Endpoint | Purpose |
|-------------|----------|---------|
| GET | `/api/records` | Fetch all records |
| POST | `/api/records` | Create new record |
```

- Align columns for readability in source
- Keep tables simple (max 5 columns)
- Use lists instead if data is not truly tabular

## Documentation Types

### API Documentation

Document each API endpoint with:

1. **Signature**: HTTP method and path with parameters
2. **Purpose**: One-sentence description
3. **Request**: Parameters, body schema, headers
4. **Response**: Success format and status codes
5. **Error cases**: Common errors and their meanings
6. **Examples**: curl command and response
7. **Notes**: Rate limits, authentication, special considerations

Example structure:

```markdown
## POST /api/records/fetch-from-discogs

Fetches detailed release information from Discogs and saves it to the database.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| releaseId | number | Yes | Discogs release ID |

### Response (201 Created)

```json
{
  "record": { ... },
  "message": "Record fetched from Discogs and saved successfully"
}
```

### Error Responses

- `400 Bad Request`: Missing or invalid releaseId
- `500 Internal Server Error`: Discogs API failure or database error

### Example

```bash
curl -X POST http://localhost:3000/api/records/fetch-from-discogs \
  -H "Content-Type: application/json" \
  -d '{"releaseId": 123456}'
```

### Notes

- Respects Discogs API rate limits (60 req/min authenticated)
- Extracts vinyl-specific metadata (size, color, shaped status)
- Returns 201 status on successful creation
```

### Component Documentation

Document each React component with:

1. **Purpose**: What the component does and when to use it
2. **Props**: Interface with types and descriptions
3. **State**: Internal state management approach
4. **Events**: User interactions and callbacks
5. **Styling**: Sass CSS Module approach and responsive behavior
6. **Example**: Simple usage example
7. **Notes**: Client/server component, dependencies, gotchas

Example structure:

```markdown
## RecordCard

Displays a vinyl record as a flip card with album art on front and detailed information on back.

### Props

```typescript
interface RecordCardProps {
  record: Record; // Database record with all fields
}
```

### Behavior

- **Front side**: Shows 1" (96px) album art, title, and artist
- **Back side**: Displays all record details and action buttons
- **Interaction**: Click anywhere to flip between sides
- **Flipped state**: Card widens (180px → 250px) and elevates with drop shadow

### Styling

- Uses CSS 3D transforms for flip animation
- Scoped styles in `RecordCard.module.scss`
- Global `.flip-card` classes in `styles/globals.scss` (required for JS class toggling)
- Responsive: scales proportionally on mobile

### Example

```tsx
<RecordCard record={recordFromDatabase} />
```

### Notes

- Client component (`"use client"`) due to interactive state
- Depends on API routes: `/api/records/update-from-discogs`, `/api/records/[recordId]`
- Includes confirmation dialogs for destructive actions
```

### Feature Documentation

Document features with:

1. **Overview**: What the feature does and why it exists
2. **User experience**: How users interact with it
3. **Implementation**: Technical approach and key files
4. **Data flow**: How data moves through the system
5. **Edge cases**: Unusual scenarios and how they're handled
6. **Future work**: Known limitations or planned improvements

### Development Guidelines

Guidelines should be:
- **Prescriptive**: Clear rules, not suggestions
- **Justified**: Explain *why* the rule exists
- **Consistent**: Follow the same patterns throughout
- **Enforced**: Include in code review checklist

## Writing Style

### Voice and Tone

- **Active voice**: "The API fetches data" not "Data is fetched by the API"
- **Present tense**: "The component displays" not "The component will display"
- **Direct**: "Use X for Y" not "You might want to consider using X"
- **Technical but clear**: Assume reader knows TypeScript/React, explain domain concepts

### Conciseness

- One idea per sentence
- One topic per paragraph
- Cut unnecessary words ("in order to" → "to")
- Use lists instead of long paragraphs

### Technical Terms

- Define domain-specific terms on first use
- Use correct technical names (TypeScript not "typescript", Next.js not "NextJS")
- Be consistent with terminology throughout docs

## Maintaining Documentation

### When to Update Docs

Update documentation in the SAME commit when you:
- Add, remove, or modify an API endpoint
- Change component props or behavior
- Add or change a feature
- Modify configuration or environment variables
- Change development or deployment processes

### Documentation Review

Before marking documentation as complete:
- [ ] All code examples are tested and runnable
- [ ] Links work (no 404s)
- [ ] Markdown renders correctly (check with preview)
- [ ] No typos or grammar errors
- [ ] Follows this style guide
- [ ] Technical accuracy verified

### Keeping Docs Fresh

Warning signs that docs need updating:
- Code examples that don't run
- References to removed features
- Instructions that don't match current UI
- Outdated dependency versions

**Fix docs immediately** when you notice drift. Stale documentation is worse than no documentation.

## Tools and Workflow

### Markdown Preview

- VS Code: Built-in preview with `Cmd+Shift+V`
- Command line: `grip` or `mdless` for terminal preview
- GitHub: Automatically renders `.md` files

### Linting

- Use markdownlint for consistency
- Configuration in `.markdownlint.json`
- Run `bun run lint` before committing

### Documentation TODOs

Use beads to track documentation work:

```bash
# Create documentation issue
bd create --title="Document new search API" --type=task --priority=2

# Link to code change
bd update <issue-id> --notes="Related to commit abc123"
```

## Examples of Good Documentation

Look to these for inspiration:
- **Stripe API Docs**: Clear, comprehensive, great examples
- **Next.js Docs**: Excellent feature documentation
- **Sass Docs**: Concise reference with visual examples
- **Drizzle ORM Docs**: Well-organized, searchable

## Anti-Patterns to Avoid

❌ **Don't**:
- Copy-paste code without testing it
- Write docs after code is "done" (do it together)
- Use screenshots for code (copy-paste breaks)
- Say "simply" or "just" (what's simple for you may not be for others)
- Leave TODOs in published docs (finish or file an issue)
- Repeat what the code already says (add value)

✅ **Do**:
- Show working code examples
- Update docs in the same PR as code
- Use code blocks for code
- Explain the concept clearly
- Track documentation work in beads
- Explain *why* and *how*, not just *what*

---

**Last Updated**: 2026-02-18 by Claude Sonnet 4.6

This style guide is a living document. Improve it as you discover better patterns.
