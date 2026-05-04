import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/pages/am_i_evil.astro", "utf8");

describe("/am_i_evil health check page", () => {
  it("renders YES I AM text", () => {
    expect(source).toContain("YES I AM");
  });

  it("sets green background on body", () => {
    expect(source).toContain("background-color: green");
  });
});
