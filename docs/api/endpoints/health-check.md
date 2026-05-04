# Health check

## GET /am_i_evil

Astro page, not an API route. Returns a static HTML page with a green body background and large `YES I AM` text.

| Field | Value |
|-------|-------|
| Source | `src/pages/am_i_evil.astro` |
| Render config | `render.yaml` → `healthCheckPath: /am_i_evil` |
| Expected body text | `YES I AM` |

## Related

- [Deployment](../../deployment/README.md)
