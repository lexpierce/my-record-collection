import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSearchByCatalogNumber,
  mockSearchByArtistAndTitle,
  mockSearchByUPC,
  mockGetRelease,
  mockExtractRecordSize,
  mockExtractVinylColor,
  mockIsShapedVinyl,
} = vi.hoisted(() => ({
  mockSearchByCatalogNumber: vi.fn(),
  mockSearchByArtistAndTitle: vi.fn(),
  mockSearchByUPC: vi.fn(),
  mockGetRelease: vi.fn(),
  mockExtractRecordSize: vi.fn().mockReturnValue('12"'),
  mockExtractVinylColor: vi.fn().mockReturnValue(null),
  mockIsShapedVinyl: vi.fn().mockReturnValue(false),
}));

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

import { GET } from "@/src/pages/api/records/search";

function makeRequest(query: Record<string, string>) {
  const params = new URLSearchParams(query).toString();
  return new Request(`http://localhost/api/records/search?${params}`);
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

describe("GET /api/records/search", () => {
  it("returns 400 when no search params provided", async () => {
    const response = await GET({ request: makeRequest({}) });
    expect(response.status).toBe(400);
  });

  it("searches by catalogNumber", async () => {
    const response = await GET({ request: makeRequest({ catalogNumber: "SHVL-804" }) });
    expect(mockSearchByCatalogNumber).toHaveBeenCalledWith("SHVL-804");
    expect(response.status).toBe(200);
  });

  it("searches by artist and title", async () => {
    const response = await GET({ request: makeRequest({ artist: "Pink Floyd", title: "Dark Side" }) });
    expect(mockSearchByArtistAndTitle).toHaveBeenCalledWith("Pink Floyd", "Dark Side");
    expect(response.status).toBe(200);
  });

  it("requires both artist and title", async () => {
    const response = await GET({ request: makeRequest({ artist: "Pink Floyd" }) });
    expect(response.status).toBe(400);
  });

  it("searches by UPC", async () => {
    const response = await GET({ request: makeRequest({ upc: "724384260804" }) });
    expect(mockSearchByUPC).toHaveBeenCalledWith("724384260804");
    expect(response.status).toBe(200);
  });

  it("returns enriched results with recordSize, vinylColor, isShapedVinyl", async () => {
    mockExtractRecordSize.mockReturnValue('12"');
    mockExtractVinylColor.mockReturnValue("Blue Vinyl");
    mockIsShapedVinyl.mockReturnValue(false);

    const response = await GET({ request: makeRequest({ catalogNumber: "CAT-1" }) });
    const body = await response.json();
    expect(body.results[0].recordSize).toBe('12"');
    expect(body.results[0].vinylColor).toBe("Blue Vinyl");
    expect(body.results[0].isShapedVinyl).toBe(false);
  });

  it("returns original result if getRelease fails for that item", async () => {
    mockGetRelease.mockRejectedValueOnce(new Error("not found"));
    const response = await GET({ request: makeRequest({ catalogNumber: "CAT-1" }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.results).toHaveLength(1);
  });

  it("limits enrichment to first 10 results", async () => {
    const bigResults = Array.from({ length: 15 }, (_, index) => ({
      id: index + 1,
      title: `Album ${index + 1}`,
    }));
    mockSearchByCatalogNumber.mockResolvedValue(bigResults);

    await GET({ request: makeRequest({ catalogNumber: "CAT" }) });
    expect(mockGetRelease).toHaveBeenCalledTimes(10);
  });

  it("returns 500 on unexpected error", async () => {
    mockSearchByCatalogNumber.mockRejectedValueOnce(new Error("API down"));
    const response = await GET({ request: makeRequest({ catalogNumber: "X" }) });
    expect(response.status).toBe(500);
  });
});
