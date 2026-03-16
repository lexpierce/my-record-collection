# RecordCard

Source: `components/records/RecordCard.tsx` + `RecordCard.module.scss`

Client component. 3D flip card.

## Props

```ts
interface RecordCardProps {
  record: Record;
  onRecordMutated: () => void;
}
```

`onRecordMutated`: called after update/delete. Parent bumps `refreshKey` to re-fetch.

## State

`isFlipped: boolean` — single toggle.

## Dimensions

- Width: 180px (250px flipped, negative margins center it)
- Height: content-driven (no min-height)
- Front art: 144px (`.album-art-size` global class)
- Back art: 216px (`.album-art-size-lg` global class)

## Front face

Album art, title (`0.875rem` bold), artist (`0.875rem`). All truncated with ellipsis.
Title and artist are tightly spaced: `margin-top: 0.0625rem` on `.albumArtist`.

## Back face

216px thumbnail, title, artist, all metadata fields (`0.875rem`), Update + Delete buttons.

Monospace fields (rendered with `styles.metaValueMono`, font `var(--font-mono)`):

- Cat# (`catalogNumber`)
- Year (`yearReleased`)
- Discogs ID (`discogsId`)

All other value spans use `styles.metaValue` (Input Sans).

## CSS classes

Global (in `styles/globals.scss`): `flip-card`, `flipped`, `flip-card-inner`, `flip-card-front`, `flip-card-back`, `album-art-size`, `album-art-size-lg`.

Module: `styles.cardFrontContent`, `styles.cardBack`, `styles.metaRow`, `styles.metaLabel`, `styles.metaValue`, `styles.metaValueMono`, `styles.actions`, etc.

## Delete flow

Two-step inline confirmation — no `window.confirm()`.

1. First `d` press: sets `confirmDeleteVisible = true`, shows "Are you sure? Yes / No" inline.
2. "Yes" button: calls `DELETE /api/records/[recordId]`, then `onRecordMutated()`.
3. "No" button: clears confirmation.

Errors shown inline via `actionError` state (no `window.alert()`).

## API calls

- `POST /api/records/update-from-discogs` (Update button)
- `DELETE /api/records/[recordId]` (Delete button)

## Accessibility

`role="button"`, `tabIndex={0}`, `aria-expanded={isFlipped}`, `onKeyDown` (Enter/Space).

## Related

- [Flip card animation](../features/flip-card-animation.md)
- [RecordShelf](./record-shelf.md)
- [UI/UX reference](../ui-ux.md)
