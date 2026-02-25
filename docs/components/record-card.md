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

`onRecordMutated`: called after update/delete. Parent bumps `mutationKey` to re-fetch.

## State

`isFlipped: boolean` — single toggle.

## Dimensions

- Width: 180px (250px flipped, negative margins center it)
- Height: content-driven (no min-height)
- Front art: 144px (`.album-art-size` global class)
- Back art: 216px (`.album-art-size-lg` global class)

## Front face

Album art, title (`0.75rem` bold), artist (`0.75rem`). All truncated with ellipsis.

## Back face

216px thumbnail, title, artist, all metadata fields (`0.625rem`), Update + Delete buttons.

## CSS classes

Global (in `styles/globals.scss`): `flip-card`, `flipped`, `flip-card-inner`, `flip-card-front`, `flip-card-back`, `album-art-size`, `album-art-size-lg`.

Module: `styles.cardFrontContent`, `styles.cardBack`, `styles.metaRow`, `styles.actions`, etc.

## Accessibility

`role="button"`, `tabIndex={0}`, `aria-expanded={isFlipped}`, `onKeyDown` (Enter/Space).

## API calls

- `POST /api/records/update-from-discogs` (Update button)
- `DELETE /api/records/[recordId]` (Delete button, with `window.confirm`)

## Related

- [Flip card animation](../features/flip-card-animation.md)
- [RecordShelf](./record-shelf.md)
