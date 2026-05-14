# TypeScript configuration

TypeScript 6.0.3. `tsconfig.json` extends `astro/tsconfigs/strict`.

## tsconfig.json

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "target": "ES2024",
    "lib": ["dom", "esnext"],
    "strict": true,
    "noUncheckedSideEffectImports": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "paths": { "@/*": ["./*"] }
  }
}
```

## Key decisions

| Option | Value | Rule |
|--------|-------|------|
| `target` | `ES2024` | Keep at ES2024; esbuild/Vite/Astro recognize it without warnings |
| `lib` | `["dom", "esnext"]` | Allows browser APIs and current JS library types |
| `moduleResolution` | `bundler` | Required for Astro/Vite-style imports |
| `noUncheckedSideEffectImports` | `true` | Verifies side-effect imports resolve |
| `strict` | `true` | Required for all TypeScript code |

## TS6 defaults that changed from TS5

| Option | TS5 default | TS6 default |
|--------|-------------|-------------|
| `strict` | `false` | `true` |
| `target` | `ES3` | `ES2025` |
| `module` | `commonjs` | `esnext` |
| `noUncheckedSideEffectImports` | `false` | `true` |

## Deprecated in TS6 — do not use

- `--moduleResolution node` / `classic` → use `bundler` or `node16`.
- `--baseUrl` → use `paths` only.
- `--outFile` → not applicable; Astro/Vite owns bundling.
- `--module amd` / `umd` / `systemjs` / `none` → removed entirely.
- `target: es5` → deprecated; will warn.

## ES2025 and esbuild

esbuild, Vite, Vitest, Astro, and `drizzle-kit` do not recognize `ES2025` as a target. Use `ES2024` in `tsconfig.json`; keep `lib: ["dom", "esnext"]` when newer API types are needed.

## ES2025 API availability

`lib: esnext` makes the TypeScript compiler accept ES2025 APIs. Production runtime is Bun; test runtime is Node.js through Vitest workers.

| API | TS lib | Bun 1.3.14 | Node.js 24 | Notes |
|-----|--------|------------|------------|-------|
| `Map.groupBy` | Yes | Yes | Yes | Safe everywhere |
| `Object.groupBy` | Yes | Yes | Yes | Safe everywhere |
| `Iterator.map / .filter / .toArray` | Yes | Yes | Yes | Safe everywhere |
| `Promise.try` | Yes | Yes | Yes | Safe everywhere |
| `RegExp.escape` | Yes | Yes | Yes | Safe everywhere |
| `Map.prototype.getOrInsert` | Yes | Yes | No | Polyfilled in `vitest.setup.ts` |
| `Map.prototype.getOrInsertComputed` | Yes | Yes | No | Polyfilled in `vitest.setup.ts` |
| `WeakMap.prototype.getOrInsert` | Yes | Yes | No | Polyfill before test use |

## Related

- [Coding standards](./coding-standards.md)
- [Testing](../testing.md)
