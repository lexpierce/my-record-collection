import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSelect, mockUpdate, mockDelete } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  getDatabase: () => ({
    select: mockSelect,
    update: mockUpdate,
    delete: mockDelete,
  }),
  schema: {
    recordsTable: { recordId: "record_id" },
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

function drizzleChain(resolveValue: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "from", "where", "set", "returning"];
  for (const method of methods) chain[method] = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: (value: unknown) => void) => resolve(resolveValue);
  return chain;
}

import { DELETE, GET, PUT } from "@/src/pages/api/records/[id]";

const mockRecord = {
  recordId: "uuid-1",
  artistName: "Nirvana",
  albumTitle: "Nevermind",
  yearReleased: 1991,
};

const routeContext = {
  request: new Request("http://localhost/api/records/uuid-1"),
  params: { id: "uuid-1" },
};

function makeContext(method: string, body?: unknown) {
  return {
    request: new Request("http://localhost/api/records/uuid-1", {
      method,
      ...(body
        ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }
        : {}),
    }),
    params: { id: "uuid-1" },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSelect.mockReturnValue(drizzleChain([mockRecord]));
  mockUpdate.mockReturnValue(drizzleChain([mockRecord]));
  mockDelete.mockReturnValue(drizzleChain([mockRecord]));
});

describe("GET /api/records/[id]", () => {
  it("returns 200 with record when found", async () => {
    const response = await GET(routeContext);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.record.albumTitle).toBe("Nevermind");
  });

  it("returns 404 when record not found", async () => {
    mockSelect.mockReturnValue(drizzleChain([]));
    const response = await GET(routeContext);
    expect(response.status).toBe(404);
  });

  it("returns 500 on DB error", async () => {
    mockSelect.mockImplementationOnce(() => { throw new Error("DB down"); });
    const response = await GET(routeContext);
    expect(response.status).toBe(500);
  });
});

describe("PUT /api/records/[id]", () => {
  it("returns 200 with updated record", async () => {
    const response = await PUT(makeContext("PUT", { albumTitle: "In Utero" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain("updated");
  });

  it("returns 404 when record not found", async () => {
    mockUpdate.mockReturnValue(drizzleChain([]));
    const response = await PUT(makeContext("PUT", { albumTitle: "x" }));
    expect(response.status).toBe(404);
  });

  it("returns 500 on DB error", async () => {
    mockUpdate.mockImplementationOnce(() => { throw new Error("DB down"); });
    const response = await PUT(makeContext("PUT", { albumTitle: "x" }));
    expect(response.status).toBe(500);
  });
});

describe("DELETE /api/records/[id]", () => {
  it("returns 200 with success message", async () => {
    const response = await DELETE(routeContext);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain("deleted");
  });

  it("returns 404 when record not found", async () => {
    mockDelete.mockReturnValue(drizzleChain([]));
    const response = await DELETE(routeContext);
    expect(response.status).toBe(404);
  });

  it("returns 500 on DB error", async () => {
    mockDelete.mockImplementationOnce(() => { throw new Error("DB down"); });
    const response = await DELETE(routeContext);
    expect(response.status).toBe(500);
  });
});
