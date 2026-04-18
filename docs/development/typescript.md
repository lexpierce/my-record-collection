# TypeScript configuration

TypeScript 6.0.3. Target: ES2025. Module: ESNext. ModuleResolution: bundler.

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2025",
    "lib": ["dom", "esnext"],
    "strict": true,
    "noUncheckedSideEffectImports": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "jsx": "react-jsx"
  }
}
```

Key decisions:

| Option | Value | Reason |
|--------|-------|--------|
| `target` | `ES2025` | Bun 1.3.12 runtime supports ES2025 natively; Next.js handles browser transpilation |
| `lib` | `["dom", "esnext"]` | `dom.iterable` and `dom.asynciterable` are bundled into `dom` since TS6 |
| `noUncheckedSideEffectImports` | `true` | TS6 default; verifies side-effect imports (CSS, setup files) resolve |
| `strict` | `true` | TS6 default; always set explicitly so intent is clear |

## TS6 defaults that changed from TS5

These were previously off or different. The project's `tsconfig.json` sets them explicitly so they don't silently change again:

| Option | TS5 default | TS6 default |
|--------|-------------|-------------|
| `strict` | `false` | `true` |
| `target` | `ES3` | `ES2025` |
| `module` | `commonjs` | `esnext` |
| `noUncheckedSideEffectImports` | `false` | `true` |

## Deprecated in TS6 — do not use

- `--moduleResolution node` / `classic` → use `bundler` or `node16`
- `--baseUrl` → use `paths` only
- `--outFile` → not applicable (Next.js owns bundling)
- `--module amd` / `umd` / `systemjs` / `none` → removed entirely
- `target: es5` → deprecated; will warn

## ES2025 and esbuild

esbuild (used by Vite/Vitest and `drizzle-kit` internally) does not recognize `ES2025` as a target — highest it supports is `ES2024`. It emits `Unrecognized target environment "ES2025"` as a **warning** only; it does not fail. Do not change `tsconfig.json` `target` to suppress this.

Contexts where this warning appears:

| Tool | When | Impact |
|------|------|--------|
| Vitest | `bun run test` locally | None — tests pass |
| drizzle-kit | `bun run db:migrate` (Render pre-deploy) | None — migrations apply |

## ES2025 API availability

`lib: esnext` makes the TypeScript compiler accept ES2025 APIs. The production
runtime is **Bun**; the test runtime is **Node.js** (vitest workers). These differ.

| API | TS lib | Bun 1.3.11 | Node.js 24 | Notes |
|-----|--------|------------|------------|-------|
| `Map.groupBy` | ✓ | ✓ | ✓ (v21+) | Safe everywhere |
| `Object.groupBy` | ✓ | ✓ | ✓ (v21+) | Safe everywhere |
| `Iterator.map / .filter / .toArray` | ✓ | ✓ | ✓ (v22+) | Safe everywhere |
| `Promise.try` | ✓ | ✓ | ✓ (v22+) | Safe everywhere |
| `RegExp.escape` | ✓ | ✓ | ✓ (v24+) | Safe everywhere |
| `Map.prototype.getOrInsert` | ✓ | ✓ | ✗ | Polyfilled in `vitest.setup.ts` |
| `Map.prototype.getOrInsertComputed` | ✓ | ✓ | ✗ | Polyfilled in `vitest.setup.ts` |
| `WeakMap.prototype.getOrInsert` | ✓ | ✓ | ✗ | Polyfill if needed |

`Map.getOrInsert` and `Map.getOrInsertComputed` are available natively in Bun
but not yet in Node.js 24. `vitest.setup.ts` polyfills them so tests match
runtime behaviour. Do not replace them with workarounds in production code.

### Iterator helpers (safe everywhere)

```typescript
const sizes = [...new Set(records.values().map((r) => r.recordSize))];
const evens = numbers.values().filter((n) => n % 2 === 0).toArray();
```

## Related

- [Coding standards](./coding-standards.md)
- [Testing](../testing.md)
