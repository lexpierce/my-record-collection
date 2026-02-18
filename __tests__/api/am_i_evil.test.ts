/**
 * Tests for GET /api/am_i_evil (health check endpoint)
 */

import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/am_i_evil/route";

describe("GET /api/am_i_evil", () => {
  it("returns 200", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it("returns status: yes_i_am", async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.status).toBe("yes_i_am");
  });

  it("includes a timestamp", async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.timestamp).toBeDefined();
    expect(() => new Date(body.timestamp)).not.toThrow();
  });

  it("includes message field", async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.message).toBeDefined();
  });
});
