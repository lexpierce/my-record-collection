import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExecute } = vi.hoisted(() => ({ mockExecute: vi.fn() }));

vi.mock("@/lib/db/client", () => ({
  getDatabase: () => ({ execute: mockExecute }),
}));

vi.mock("drizzle-orm", () => ({
  sql: (strings: TemplateStringsArray) => ({ query: strings.join("") }),
}));

import { GET } from "@/src/pages/api/health";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/health", () => {
  it("returns 200 ok when the database query succeeds", async () => {
    mockExecute.mockResolvedValueOnce([{ "?column?": 1 }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("ok");
  });

  it("returns 503 degraded when the database query fails", async () => {
    mockExecute.mockRejectedValueOnce(new Error("connection refused"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect((await response.json()).status).toBe("degraded");
  });
});
