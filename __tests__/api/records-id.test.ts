/**
 * Tests for GET, PUT, DELETE /api/records/[id]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function drizzleChain(resolveValue: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "from", "where", "set", "returning"];
  for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: (v: unknown) => void) => resolve(resolveValue);
  return chain;
}

import { GET, PUT, DELETE } from "@/app/api/records/[id]/route";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const mockRecord = {
  recordId: "uuid-1",
  artistName: "Nirvana",
  albumTitle: "Nevermind",
  yearReleased: 1991,
};

const routeContext = {
  params: Promise.resolve({ id: "uuid-1" }),
};

function makeRequest(method: string, body?: unknown) {
  return new NextRequest(`http://localhost/api/records/uuid-1`, {
    method,
    ...(body
      ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }
      : {}),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSelect.mockReturnValue(drizzleChain([mockRecord]));
  mockUpdate.mockReturnValue(drizzleChain([mockRecord]));
  mockDelete.mockReturnValue(drizzleChain([mockRecord]));
});

// ---------------------------------------------------------------------------
// GET /api/records/[id]
// ---------------------------------------------------------------------------

describe("GET /api/records/[id]", () => {
  it("returns 200 with record when found", async () => {
    const response = await GET(makeRequest("GET"), routeContext);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.record.albumTitle).toBe("Nevermind");
  });

  it("returns 404 when record not found", async () => {
    mockSelect.mockReturnValue(drizzleChain([]));
    const response = await GET(makeRequest("GET"), routeContext);
    expect(response.status).toBe(404);
  });

  it("returns 500 on DB error", async () => {
    mockSelect.mockImplementationOnce(() => { throw new Error("DB down"); });
    const response = await GET(makeRequest("GET"), routeContext);
    expect(response.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/records/[id]
// ---------------------------------------------------------------------------

describe("PUT /api/records/[id]", () => {
  it("returns 200 with updated record", async () => {
    const response = await PUT(makeRequest("PUT", { albumTitle: "In Utero" }), routeContext);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain("updated");
  });

  it("returns 404 when record not found", async () => {
    mockUpdate.mockReturnValue(drizzleChain([]));
    const response = await PUT(makeRequest("PUT", { albumTitle: "x" }), routeContext);
    expect(response.status).toBe(404);
  });

  it("returns 500 on DB error", async () => {
    mockUpdate.mockImplementationOnce(() => { throw new Error("DB down"); });
    const response = await PUT(makeRequest("PUT", { albumTitle: "x" }), routeContext);
    expect(response.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/records/[id]
// ---------------------------------------------------------------------------

describe("DELETE /api/records/[id]", () => {
  it("returns 200 with success message", async () => {
    const response = await DELETE(makeRequest("DELETE"), routeContext);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain("deleted");
  });

  it("returns 404 when record not found", async () => {
    mockDelete.mockReturnValue(drizzleChain([]));
    const response = await DELETE(makeRequest("DELETE"), routeContext);
    expect(response.status).toBe(404);
  });

  it("returns 500 on DB error", async () => {
    mockDelete.mockImplementationOnce(() => { throw new Error("DB down"); });
    const response = await DELETE(makeRequest("DELETE"), routeContext);
    expect(response.status).toBe(500);
  });
});
