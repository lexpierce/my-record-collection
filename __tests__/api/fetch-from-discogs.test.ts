/**
 * Tests for POST /api/records/fetch-from-discogs
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockGetRelease,
  mockAddToCollection,
  mockExtractRecordSize,
  mockExtractVinylColor,
  mockIsShapedVinyl,
  mockInsert,
  mockUpdate,
} = vi.hoisted(() => ({
  mockGetRelease: vi.fn(),
  mockAddToCollection: vi.fn(),
  mockExtractRecordSize: vi.fn(),
  mockExtractVinylColor: vi.fn(),
  mockIsShapedVinyl: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("@/lib/discogs/client", () => ({
  createDiscogsClient: () => ({
    getRelease: mockGetRelease,
    addToCollection: mockAddToCollection,
    extractRecordSize: mockExtractRecordSize,
    extractVinylColor: mockExtractVinylColor,
    isShapedVinyl: mockIsShapedVinyl,
  }),
}));

vi.mock("@/lib/db/client", () => ({
  database: {
    insert: mockInsert,
    update: mockUpdate,
  },
  schema: {
    recordsTable: { recordId: "record_id", isSyncedWithDiscogs: "is_synced_with_discogs" },
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
  for (const m of ["values", "returning", "set", "where"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(resolveValue);
  return chain;
}

import { POST } from "@/app/api/records/fetch-from-discogs/route";

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

const savedRecord = {
  recordId: "uuid-new",
  artistName: "Nirvana",
  albumTitle: "Nevermind",
  isSyncedWithDiscogs: false,
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/records/fetch-from-discogs", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DISCOGS_USERNAME = "testuser";
  mockGetRelease.mockResolvedValue(mockRelease);
  mockExtractRecordSize.mockReturnValue('12"');
  mockExtractVinylColor.mockReturnValue(null);
  mockIsShapedVinyl.mockReturnValue(false);
  mockInsert.mockReturnValue(drizzleChain([savedRecord]));
  mockUpdate.mockReturnValue(drizzleChain([savedRecord]));
  mockAddToCollection.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/records/fetch-from-discogs", () => {
  it("returns 400 when releaseId is missing", async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 201 with saved record on success", async () => {
    const response = await POST(makeRequest({ releaseId: 123 }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.record).toBeDefined();
  });

  it("calls getRelease with the correct release ID", async () => {
    await POST(makeRequest({ releaseId: 456 }));
    expect(mockGetRelease).toHaveBeenCalledWith(456);
  });

  it("attempts addToCollection when DISCOGS_USERNAME is set", async () => {
    await POST(makeRequest({ releaseId: 123 }));
    expect(mockAddToCollection).toHaveBeenCalledWith("testuser", 123);
  });

  it("does not attempt addToCollection when DISCOGS_USERNAME is unset", async () => {
    delete process.env.DISCOGS_USERNAME;
    await POST(makeRequest({ releaseId: 123 }));
    expect(mockAddToCollection).not.toHaveBeenCalled();
  });

  it("handles 409 from addToCollection gracefully (marks as synced)", async () => {
    mockAddToCollection.mockRejectedValueOnce(
      Object.assign(new Error("conflict"), { status: 409 })
    );
    const response = await POST(makeRequest({ releaseId: 123 }));
    expect(response.status).toBe(201);
  });

  it("logs warning but succeeds if addToCollection fails with non-409", async () => {
    mockAddToCollection.mockRejectedValueOnce(new Error("rate limited"));
    const response = await POST(makeRequest({ releaseId: 123 }));
    expect(response.status).toBe(201);
  });

  it("returns 500 when getRelease throws", async () => {
    mockGetRelease.mockRejectedValueOnce(new Error("API down"));
    const response = await POST(makeRequest({ releaseId: 123 }));
    expect(response.status).toBe(500);
  });
});
