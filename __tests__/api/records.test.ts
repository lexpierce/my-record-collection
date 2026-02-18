/**
 * Tests for GET and POST /api/records
 *
 * The database module is mocked so no real Postgres connection is needed.
 * vi.hoisted() is used because vi.mock() factories are hoisted before const declarations.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mock state (must be defined before vi.mock calls)
// ---------------------------------------------------------------------------

const { mockSelect, mockInsert } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  database: {
    select: mockSelect,
    insert: mockInsert,
  },
  schema: {
    recordsTable: {
      createdAt: "created_at",
      artistName: "artist_name",
      albumTitle: "album_title",
    },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function drizzleChain(resolveValue: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["from", "orderBy", "values", "returning", "where", "set"];
  for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: (v: unknown) => void) => resolve(resolveValue);
  return chain;
}

// Import handlers after mocks are registered
import { GET, POST } from "@/app/api/records/route";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const mockRecord = {
  recordId: "uuid-1",
  artistName: "Nirvana",
  albumTitle: "Nevermind",
  yearReleased: 1991,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSelect.mockReturnValue(drizzleChain([mockRecord]));
  mockInsert.mockReturnValue(drizzleChain([mockRecord]));
});

// ---------------------------------------------------------------------------
// GET /api/records
// ---------------------------------------------------------------------------

describe("GET /api/records", () => {
  it("returns 200 with records array", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.records)).toBe(true);
    expect(body.records[0].albumTitle).toBe("Nevermind");
  });

  it("includes count field", async () => {
    const response = await GET();
    const body = await response.json();
    expect(body.count).toBe(1);
  });

  it("returns 500 when database throws", async () => {
    mockSelect.mockImplementationOnce(() => {
      throw new Error("DB error");
    });
    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// POST /api/records
// ---------------------------------------------------------------------------

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/records", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/records", () => {
  it("returns 201 with new record on success", async () => {
    const req = makeRequest({ artistName: "Nirvana", albumTitle: "Nevermind" });
    const response = await POST(req);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.record).toBeDefined();
  });

  it("returns 400 when artistName is missing", async () => {
    const req = makeRequest({ albumTitle: "Nevermind" });
    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Missing required fields");
  });

  it("returns 400 when albumTitle is missing", async () => {
    const req = makeRequest({ artistName: "Nirvana" });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 500 when database throws", async () => {
    mockInsert.mockImplementationOnce(() => {
      throw new Error("insert failed");
    });
    const req = makeRequest({ artistName: "Nirvana", albumTitle: "Nevermind" });
    const response = await POST(req);
    expect(response.status).toBe(500);
  });
});
