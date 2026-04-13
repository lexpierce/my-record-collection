# Project Memory

## Tool preferences

- Use `rg` (ripgrep) instead of `grep`
- Use `fd` instead of `find`

## Commands

- **Tests**: `bun run test` (runs vitest) — NOT `bun test` (Bun's native runner, incompatible with vitest mocks/jsdom)
- **Type-check**: `bun run type-check`
- **Lint**: `bun run lint`
- **Build**: `bun run build`
- **Update bun packages**: `bun update` (not `bun upgrade`, which upgrades bun itself)
- **Update superpowers skills**: `git -C ~/.config/agents/superpowers pull`
