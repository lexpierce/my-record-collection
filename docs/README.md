# Documentation index

Agent-oriented documentation for the My Record Collection project. See
[STYLE_GUIDE.md](./STYLE_GUIDE.md) for doc conventions.

## File map

```text
docs/
├── STYLE_GUIDE.md              # Doc conventions (agent-first)
├── TODO.md                     # Tracked work items
├── api/
│   ├── README.md               # API endpoint reference
│   ├── discogs-client.md       # DiscogsClient class reference
│   └── endpoints/
│       ├── health-check.md
│       ├── records-crud.md
│       ├── discogs-integration.md
│       └── sync-status.md
├── components/
│   ├── README.md               # Component index
│   ├── record-card.md
│   ├── record-shelf.md
│   └── search-bar.md
├── development/
│   ├── README.md               # Tech stack, commands, design decisions
│   ├── coding-standards.md     # Code rules (TS, Go, CSS, testing)
│   ├── database-schema.md      # records table schema
│   └── api-design-patterns.md  # Route handler conventions
├── features/
│   ├── README.md               # Feature index
│   ├── discogs-integration.md  # Search/fetch/sync workflows
│   ├── flip-card-animation.md  # CSS 3D flip card rules
│   └── vinyl-metadata.md       # Vinyl format extraction logic
├── deployment/
│   └── README.md               # Render deployment config
├── error-handling.md           # Error propagation rules
├── testing.md                  # Vitest/RTL test patterns
└── ui-ux.md                    # Color tokens, layout rules, interactions

tui/
├── README.md                   # TUI setup, config, keybindings, image protocols
├── main.go
├── config/config.go            # Config file + env var reader
├── db/
│   ├── connect.go              # pgxpool connection
│   └── records.go              # Record struct, queries
└── ui/
    ├── model.go                # Bubble Tea model
    ├── styles.go               # Lip Gloss styles
    └── image.go                # Image protocol detection + rendering
```

## Quick lookup

| What | Where |
|------|-------|
| Database schema | [development/database-schema.md](./development/database-schema.md) |
| API endpoints | [api/README.md](./api/README.md) |
| Code rules (TS + Go) | [development/coding-standards.md](./development/coding-standards.md) |
| Test patterns | [testing.md](./testing.md) |
| CSS color tokens | [ui-ux.md](./ui-ux.md) |
| Deployment config | [deployment/README.md](./deployment/README.md) |
| TUI config + image protocols | [../tui/README.md](../tui/README.md) |
| Build commands | [development/README.md](./development/README.md) |
