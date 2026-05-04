# Record card

Runtime card markup is produced by `renderRecordCard()` in `src/scripts/record-app.ts` and styled by `src/styles/record-app.scss` plus flip-card globals in `src/styles/globals.scss`.

## State

| State | Location | Purpose |
|-------|----------|---------|
| `flipped` class | DOM class on `[data-record-card]` | Drives 3D flip transform |
| `aria-expanded` | DOM attr on card root | Accessibility state |
| `[data-confirm-delete]` | Hidden/shown DOM block | Inline delete confirmation |
| `[data-action-error]` | Hidden/shown DOM block | Inline action failures |

## Dimensions

| Element | Size |
|---------|------|
| Card front | 180px wide |
| Flipped card | 250px wide |
| Front art | 144px |
| Back art | 216px |

## API calls

| Action | Endpoint |
|--------|----------|
| Update | `POST /api/records/update-from-discogs` |
| Delete | `DELETE /api/records/[recordId]` |

## Accessibility

Card roots use `role="button"`, `tabindex="0"`, `aria-expanded`, and Enter/Space keyboard handlers.

## Related

- [Record shelf](./record-shelf.md)
- [Flip card animation](../features/flip-card-animation.md)
