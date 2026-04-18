# Health check

## GET /am_i_evil

Next.js page (not an API route). Returns a static HTML page with a green body background and large "YES I AM" text.

- Source: `app/am_i_evil/page.tsx`
- Layout: `app/am_i_evil/layout.tsx` — injects `<style>body { background-color: green !important; }</style>`
- `!important` is required: root layout (`app/layout.tsx`) applies `className={styles.body}` which sets `background-color` via a CSS module class, overriding a plain element selector

Render health check path: `render.yaml` → `healthCheckPath: /am_i_evil`

## Related

- [Deployment](../../deployment/README.md)
