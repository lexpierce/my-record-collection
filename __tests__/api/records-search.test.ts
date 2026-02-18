/**
 * Tests for GET /api/records/search
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mock Discogs client
// ---------------------------------------------------------------------------

const mockSearchByCatalogNumber = vi.fn();
const mockSearchByArtistAndTitle = vi.fn();
const mockSearchByUPC = vi.fn();
const mockGetRelease = vi.fn();
const mockExtractRecordSize = vi.fn().mockReturnValue('12"');
const mockExtractVinylColor = vi.fn().mockReturnValue(null);
const mockIsShapedVinyl = vi.fn().mockReturnValue(false);

vi.mock("@/lib/discogs/client", () => ({
  createDiscogsClient: () => ({
    searchByCatalogNumber: mockSearchByCatalogNumber,
    searchByArtistAndTitle: mockSearchByArtistAndTitle,
    searchByUPC: mockSearchByUPC,
    getRelease: mockGetRelease,
    extractRecordSize: mockExtractRecordSize,
    extractVinylColor: mockExtractVinylColor,
    isShapedVinyl: mockIsShapedVinyl,
  }),
}));

import { GET } from "@/app/api/records/search/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(query: Record<string, string>) {
  const params = new URLSearchParams(query).toString();
  return new NextRequest(`http://localhost/api/records/search?${params}`);
}

const mockSearchResults = [
  { id: 1, title: "Test Album", year: "2000" },
];

const mockRelease = {
  id: 1,
  title: "Test Album",
  formats: [{ name: "Vinyl", qty: "1", descriptions: ['12"'] }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetRelease.mockResolvedValue(mockRelease);
  mockSearchByCatalogNumber.mockResolvedValue(mockSearchResults);
  mockSearchByArtistAndTitle.mockResolvedValue(mockSearchResults);
  mockSearchByUPC.mockResolvedValue(mockSearchResults);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/records/search", () => {
  it("returns 400 when no search params provided", async () => {
    const response = await GET(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it("searches by catalogNumber", async () => {
    const response = await GET(makeRequest({ catalogNumber: "SHVL-804" }));
    expect(mockSearchByCatalogNumber).toHaveBeenCalledWith("SHVL-804");
    expect(response.status).toBe(200);
  });

  it("searches by artist and title", async () => {
    const response = await GET(makeRequest({ artist: "Pink Floyd", title: "Dark Side" }));
    expect(mockSearchByArtistAndTitle).toHaveBeenCalledWith("Pink Floyd", "Dark Side");
    expect(response.status).toBe(200);
  });

  it("requires both artist and title (not just one)", async () => {
    // Only artist, no title → falls through to 400
    const response = await GET(makeRequest({ artist: "Pink Floyd" }));
    expect(response.status).toBe(400);
  });

  it("searches by UPC", async () => {
    const response = await GET(makeRequest({ upc: "724384260804" }));
    expect(mockSearchByUPC).toHaveBeenCalledWith("724384260804");
    expect(response.status).toBe(200);
  });

  it("returns enriched results with recordSize, vinylColor, isShapedVinyl", async () => {
    mockExtractRecordSize.mockReturnValue('12"');
    mockExtractVinylColor.mockReturnValue("Blue Vinyl");
    mockIsShapedVinyl.mockReturnValue(false);

    const response = await GET(makeRequest({ catalogNumber: "CAT-1" }));
    const body = await response.json();
    expect(body.results[0].recordSize).toBe('12"');
    expect(body.results[0].vinylColor).toBe("Blue Vinyl");
    expect(body.results[0].isShapedVinyl).toBe(false);
  });

  it("returns original result if getRelease fails for that item", async () => {
    mockGetRelease.mockRejectedValueOnce(new Error("not found"));
    const response = await GET(makeRequest({ catalogNumber: "CAT-1" }));
    // Should still return 200 with the base result
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.results).toHaveLength(1);
  });

  it("limits enrichment to first 10 results", async () => {
    // Return 15 results
    const bigResults = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      title: `Album ${i + 1}`,
    }));
    mockSearchByCatalogNumber.mockResolvedValue(bigResults);

    await GET(makeRequest({ catalogNumber: "CAT" }));
    // getRelease should only be called 10 times
    expect(mockGetRelease).toHaveBeenCalledTimes(10);
  });

  it("returns 500 on unexpected error", async () => {
    mockSearchByCatalogNumber.mockRejectedValueOnce(new Error("API down"));
    const response = await GET(makeRequest({ catalogNumber: "X" }));
    expect(response.status).toBe(500);
  });
});
