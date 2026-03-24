# TypeScript configuration

TypeScript 6.0.2. Target: ES2025. Module: ESNext. ModuleResolution: bundler.

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
| `target` | `ES2025` | Node.js 24 supports ES2025 natively; Next.js handles browser transpilation |
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

## ES2025 API availability — Node.js 24

`lib: esnext` makes the TypeScript compiler accept ES2025 APIs. Not all are
implemented in Node.js 24 at runtime. Always verify runtime support before using.

| API | In TS lib | Node.js 24 | Safe to use |
|-----|-----------|------------|-------------|
| `Map.groupBy` | ✓ | ✓ (v21+) | **Yes** |
| `Object.groupBy` | ✓ | ✓ (v21+) | **Yes** |
| `Iterator.map / .filter / .toArray` | ✓ | ✓ (v22+) | **Yes** |
| `Promise.try` | ✓ | ✓ (v22+) | **Yes** |
| `RegExp.escape` | ✓ | ✓ (v24+) | **Yes** |
| `Map.prototype.getOrInsert` | ✓ | ✗ | **No** |
| `Map.prototype.getOrInsertComputed` | ✓ | ✗ | **No** |
| `WeakMap.prototype.getOrInsert` | ✓ | ✗ | **No** |

`Map.getOrInsert` / `Map.getOrInsertComputed` are in the TC39 ES2025 spec and
in TypeScript's lib but have not landed in Node.js as of v24.14.0.
The type-checker will accept them; the runtime will throw `TypeError: ... is not a function`.

### Preferred replacements

Instead of `Map.getOrInsertComputed`:

```typescript
// Use Map.groupBy when building from an iterable in one pass
const byLetter = Map.groupBy(records, (r) => r.name[0]);

// Use manual has/set/get when mutating an existing Map incrementally
if (!m.has(key)) m.set(key, []);
m.get(key)!.push(value);
```

Instead of `Map.getOrInsert`:

```typescript
const existing = m.get(key) ?? defaultValue;
if (!m.has(key)) m.set(key, defaultValue);
```

### Iterator helpers (safe)

```typescript
// All safe in Node.js 22+ / Node.js 24
const sizes = [...new Set(records.values().map((r) => r.recordSize))];
const evens = numbers.values().filter((n) => n % 2 === 0).toArray();
```

## Related

- [Coding standards](./coding-standards.md)
- [Testing](../testing.md)
