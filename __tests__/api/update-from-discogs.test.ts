/**
 * Tests for POST /api/records/update-from-discogs
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockGetRelease,
  mockExtractRecordSize,
  mockExtractVinylColor,
  mockIsShapedVinyl,
  mockUpdate,
} = vi.hoisted(() => ({
  mockGetRelease: vi.fn(),
  mockExtractRecordSize: vi.fn(),
  mockExtractVinylColor: vi.fn(),
  mockIsShapedVinyl: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("@/lib/discogs/client", () => ({
  createDiscogsClient: () => ({
    getRelease: mockGetRelease,
    extractRecordSize: mockExtractRecordSize,
    extractVinylColor: mockExtractVinylColor,
    isShapedVinyl: mockIsShapedVinyl,
  }),
}));

vi.mock("@/lib/db/client", () => ({
  database: { update: mockUpdate },
  schema: { recordsTable: { recordId: "record_id" } },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function drizzleChain(resolveValue: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ["set", "where", "returning"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(resolveValue);
  return chain;
}

import { POST } from "@/app/api/records/update-from-discogs/route";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockRelease = {
  id: 123,
  title: "Nevermind",
  artists: [{ name: "Nirvana" }],
  year: 1991,
  labels: [{ name: "DGC", catno: "DGC-24425" }],
  genres: ["Rock"],
  styles: ["Grunge"],
  thumb: "http://thumb.jpg",
  cover_image: "http://cover.jpg",
  uri: "https://discogs.com/release/123",
  formats: [{ name: "Vinyl", qty: "1", descriptions: ['12"'] }],
};

const updatedRecord = { recordId: "uuid-1", albumTitle: "Nevermind" };

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/records/update-from-discogs", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetRelease.mockResolvedValue(mockRelease);
  mockExtractRecordSize.mockReturnValue('12"');
  mockExtractVinylColor.mockReturnValue(null);
  mockIsShapedVinyl.mockReturnValue(false);
  mockUpdate.mockReturnValue(drizzleChain([updatedRecord]));
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/records/update-from-discogs", () => {
  it("returns 400 when recordId is missing", async () => {
    const response = await POST(makeRequest({ discogsId: "123" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when discogsId is missing", async () => {
    const response = await POST(makeRequest({ recordId: "uuid-1" }));
    expect(response.status).toBe(400);
  });

  it("returns 200 with updated record on success", async () => {
    const response = await POST(makeRequest({ recordId: "uuid-1", discogsId: "123" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.record).toBeDefined();
  });

  it("returns 404 when DB update finds no matching record", async () => {
    mockUpdate.mockReturnValue(drizzleChain([]));
    const response = await POST(makeRequest({ recordId: "uuid-1", discogsId: "123" }));
    expect(response.status).toBe(404);
  });

  it("passes parsed int discogsId to getRelease", async () => {
    await POST(makeRequest({ recordId: "uuid-1", discogsId: "456" }));
    expect(mockGetRelease).toHaveBeenCalledWith(456);
  });

  it("returns 500 when getRelease throws", async () => {
    mockGetRelease.mockRejectedValueOnce(new Error("API down"));
    const response = await POST(makeRequest({ recordId: "uuid-1", discogsId: "123" }));
    expect(response.status).toBe(500);
  });
});
