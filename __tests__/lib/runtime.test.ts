import { describe, it, expect, afterEach, vi } from "vitest";
import { hasBunImage, warnIfBunImageMissing } from "@/lib/runtime";

type TestGlobal = typeof globalThis & { Bun?: { Image?: unknown } };
const testGlobal = globalThis as TestGlobal;
const originalBun = testGlobal.Bun;

afterEach(() => {
  testGlobal.Bun = originalBun;
  vi.restoreAllMocks();
});

describe("hasBunImage", () => {
  it("is true when globalThis.Bun.Image is a constructor", () => {
    testGlobal.Bun = { Image: class {} };
    expect(hasBunImage()).toBe(true);
  });

  it("is false when Bun is absent", () => {
    delete testGlobal.Bun;
    expect(hasBunImage()).toBe(false);
  });

  it("is false when Bun.Image is missing", () => {
    testGlobal.Bun = {};
    expect(hasBunImage()).toBe(false);
  });
});

describe("warnIfBunImageMissing", () => {
  it("does not throw regardless of runtime", () => {
    delete testGlobal.Bun;
    expect(() => warnIfBunImageMissing()).not.toThrow();
  });
});
