# Component reference

The web UI is rendered by Astro markup in `src/pages/index.astro` and controlled by vanilla TypeScript in `src/scripts/record-app.ts`.

## Units

| UI unit | Markup/styles | Behavior |
|---------|---------------|----------|
| Home shell | `src/pages/index.astro`, `src/styles/record-app.scss` | `src/scripts/record-app.ts` |
| Search panel | `src/pages/index.astro`, `src/styles/record-app.scss` | `setSearchMethod()`, `handleSearchSubmit()`, `addSearchResult()` |
| Record shelf | Runtime HTML from `renderShelf()` | sorting, filtering, alpha nav, pagination in `record-app.ts` |
| Record card | Runtime HTML from `renderRecordCard()` | flip/update/delete in `record-app.ts` |
| Pure helpers | — | `src/scripts/record-helpers.ts` |

## Related

- [Record card](./record-card.md)
- [Record shelf](./record-shelf.md)
- [Search bar](./search-bar.md)
