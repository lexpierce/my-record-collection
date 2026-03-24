/**
 * Global test setup file — runs once before each test file.
 *
 * Imports @testing-library/jest-dom to extend Vitest's expect() with
 * DOM-specific matchers like toBeInTheDocument(), toHaveTextContent(), etc.
 */

import "@testing-library/jest-dom";

// Vitest workers run under Node.js, which does not yet implement
// Map.prototype.getOrInsert / getOrInsertComputed (ES2025 stage 4).
// Bun 1.3.11+ ships these natively; this polyfill makes tests match runtime behaviour.
if (!Map.prototype.getOrInsert) {
  Map.prototype.getOrInsert = function <K, V>(this: Map<K, V>, key: K, value: V): V {
    if (!this.has(key)) this.set(key, value);
    return this.get(key) as V;
  };
}
if (!Map.prototype.getOrInsertComputed) {
  Map.prototype.getOrInsertComputed = function <K, V>(
    this: Map<K, V>,
    key: K,
    callbackfn: (key: K) => V,
  ): V {
    if (!this.has(key)) this.set(key, callbackfn(key));
    return this.get(key) as V;
  };
}
