import { describe, it, expect, vi, beforeEach } from "vitest";

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
  getDatabase: () => ({ update: mockUpdate }),
  schema: { recordsTable: { recordId: "record_id" } },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

function drizzleChain(resolveValue: unknown) {
  const chain: Record<string, unknown> = {};
  for (const method of ["set", "where", "returning"]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (value: unknown) => void) => resolve(resolveValue);
  return chain;
}

import { POST } from "@/src/pages/api/records/update-from-discogs";

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
  return new Request("http://localhost/api/records/update-from-discogs", {
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

describe("POST /api/records/update-from-discogs", () => {
  it("returns 400 when recordId is missing", async () => {
    const response = await POST({ request: makeRequest({ discogsId: "123" }) });
    expect(response.status).toBe(400);
  });

  it("returns 400 when discogsId is missing", async () => {
    const response = await POST({ request: makeRequest({ recordId: "uuid-1" }) });
    expect(response.status).toBe(400);
  });

  it("returns 200 with updated record on success", async () => {
    const response = await POST({ request: makeRequest({ recordId: "uuid-1", discogsId: "123" }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.record).toBeDefined();
  });

  it("returns 404 when DB update finds no matching record", async () => {
    mockUpdate.mockReturnValue(drizzleChain([]));
    const response = await POST({ request: makeRequest({ recordId: "uuid-1", discogsId: "123" }) });
    expect(response.status).toBe(404);
  });

  it("passes parsed int discogsId to getRelease", async () => {
    await POST({ request: makeRequest({ recordId: "uuid-1", discogsId: "456" }) });
    expect(mockGetRelease).toHaveBeenCalledWith(456);
  });

  it("returns 400 for a non-numeric discogsId without calling getRelease", async () => {
    const response = await POST({ request: makeRequest({ recordId: "uuid-1", discogsId: "abc" }) });
    expect(response.status).toBe(400);
    expect(mockGetRelease).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-positive discogsId", async () => {
    const response = await POST({ request: makeRequest({ recordId: "uuid-1", discogsId: "0" }) });
    expect(response.status).toBe(400);
    expect(mockGetRelease).not.toHaveBeenCalled();
  });

  it("returns 500 when getRelease throws", async () => {
    mockGetRelease.mockRejectedValueOnce(new Error("API down"));
    const response = await POST({ request: makeRequest({ recordId: "uuid-1", discogsId: "123" }) });
    expect(response.status).toBe(500);
  });
});
