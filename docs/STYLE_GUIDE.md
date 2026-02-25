# Documentation style guide

These docs are written for **LLM agents**, not humans. Every design choice
optimizes for fast, accurate retrieval by coding assistants working in this
repo.

## Principles

- **Facts over prose**: State what is true. No motivation, no persuasion.
- **Lookup over reading**: Tables, flat lists, and `file:line` references
  beat paragraphs.
- **One fact, one place**: Never duplicate information across files. Link
  instead.
- **Exact over approximate**: Use exact file paths, exact type names, exact
  CLI commands. Agents copy-paste; humans skim.
- **Constraints over suggestions**: "Do X" not "Consider doing X". Agents
  need rules, not options.

## File naming

- Lowercase kebab-case: `database-schema.md`, not `DatabaseSchema.md`
- One topic per file; split rather than append

## Markdown rules

- ATX headers (`#`), sentence case, no skipped levels
- Code blocks always have a language identifier
- Tables for structured data; lists for sequences
- `-` for unordered lists, `1.` for ordered
- Relative links for internal docs: `[schema](./development/database-schema.md)`
- Run `bunx markdownlint-cli2` before committing (config: `.markdownlint.json`)

## What belongs in docs

| Include | Exclude |
|---------|---------|
| Exact file paths and line numbers | Narrative explanations of "why we chose X" |
| Type signatures and schemas | Motivational text, philosophy |
| CLI commands (copy-pasteable) | "Getting started" tutorials |
| Decision rules ("if X then Y") | Persuasive writing, sales copy |
| Constraints and invariants | Browser compatibility tables |
| Error codes and their meaning | "Future enhancements" wishlists |
| Lookup tables | Redundant examples showing the same thing twice |

## Document structure

Every doc should follow this order:

1. **H1 title** — noun phrase, not a sentence
2. **Summary** — 1-2 sentences max. What this file documents.
3. **Reference tables / code / rules** — the actual content
4. **Related** — links to other docs (if needed)

No "Overview" or "Introduction" sections. Get to the facts.

## Updating docs

Update in the same commit as the code change. If a doc drifts from code,
fix immediately — stale docs are worse than missing docs for agents.

## Linting

```bash
bun run lint:md       # markdownlint-cli2 on all Markdown files
```
