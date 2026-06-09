/**
 * Tests for lib/discogs/sync.ts (read-only pull-only cache sync)
 *
 * Uses vi.hoisted() so mock variables are available when vi.mock() factories run.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock state
// ---------------------------------------------------------------------------

const {
  mockInsert,
  mockUpdate,
  mockSelect,
  mockGetUserCollection,
  mockExtractRecordSize,
  mockExtractVinylColor,
  mockIsShapedVinyl,
} = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockSelect: vi.fn(),
  mockGetUserCollection: vi.fn(),
  mockExtractRecordSize: vi.fn(),
  mockExtractVinylColor: vi.fn(),
  mockIsShapedVinyl: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  getDatabase: () => ({
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
  }),
  schema: {
    recordsTable: {
      discogsId: "discogs_id",
      recordId: "record_id",
      isSyncedWithDiscogs: "is_synced_with_discogs",
    },
  },
}));

vi.mock("@/lib/discogs/client", () => ({
  createDiscogsClient: () => ({
    getUserCollection: mockGetUserCollection,
    extractRecordSize: mockExtractRecordSize,
    extractVinylColor: mockExtractVinylColor,
    isShapedVinyl: mockIsShapedVinyl,
  }),
}));

import { executeSync } from "@/lib/discogs/sync";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRelease(id: number, title = "Test Album") {
  return {
    id: id * 100,
    rating: 0,
    basic_information: {
      id,
      title,
      year: 2000,
      thumb: "http://example.com/thumb.jpg",
      cover_image: "http://example.com/cover.jpg",
      formats: [{ name: "Vinyl", qty: "1", descriptions: ['12"'] }],
      labels: [{ name: "Test Label", catno: `CAT-${id}` }],
      genres: ["Rock"],
      styles: ["Alternative"],
      artists: [{ name: "Test Artist" }],
      resource_url: `https://api.discogs.com/releases/${id}`,
    },
  };
}

function singlePageCollection(releases: ReturnType<typeof makeRelease>[]) {
  return {
    pagination: { page: 1, pages: 1, per_page: 100, items: releases.length },
    releases,
  };
}

// Drizzle builder stub: chains all methods, resolves to given value on await
function drizzleChain(resolveValue: unknown = []) {
  const chain: Record<string, unknown> = {};
  for (const m of ["values", "set", "where", "from", "returning"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(resolveValue);
  return chain;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DISCOGS_USERNAME = "testuser";

  // Default: empty local DB
  mockSelect.mockReturnValue(drizzleChain([]));
  // Default: empty Discogs collection
  mockGetUserCollection.mockResolvedValue(singlePageCollection([]));
  // Default: insert/update succeed
  mockInsert.mockReturnValue(drizzleChain([]));
  mockUpdate.mockReturnValue(drizzleChain([]));
  // Default vinyl helpers
  mockExtractRecordSize.mockReturnValue('12"');
  mockExtractVinylColor.mockReturnValue(null);
  mockIsShapedVinyl.mockReturnValue(false);
});

// ---------------------------------------------------------------------------
// Error: missing username
// ---------------------------------------------------------------------------

describe("executeSync — missing DISCOGS_USERNAME", () => {
  it("throws when DISCOGS_USERNAME is not set", async () => {
    delete process.env.DISCOGS_USERNAME;
    await expect(executeSync(() => {})).rejects.toThrow("DISCOGS_USERNAME");
  });
});

// ---------------------------------------------------------------------------
// Pull phase
// ---------------------------------------------------------------------------

describe("executeSync — pull phase", () => {
  it("inserts new releases not in local DB", async () => {
    mockGetUserCollection.mockResolvedValue(
      singlePageCollection([makeRelease(1), makeRelease(2)])
    );
    mockSelect.mockReturnValue(drizzleChain([]));

    const result = await executeSync(() => {});
    expect(result.pulled).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("refreshes (updates) releases already in local DB", async () => {
    mockGetUserCollection.mockResolvedValue(
      singlePageCollection([makeRelease(1), makeRelease(2)])
    );
    // Local DB already has release 1
    mockSelect.mockReturnValue(drizzleChain([{ discogsId: "1" }]));

    const result = await executeSync(() => {});
    expect(result.pulled).toBe(1);
    expect(result.updated).toBe(1);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("never writes back to Discogs", async () => {
    const client = (await import("@/lib/discogs/client")).createDiscogsClient();
    expect("addToCollection" in client).toBe(false);
  });

  it("skips on unique constraint error (not added to errors list)", async () => {
    mockGetUserCollection.mockResolvedValue(singlePageCollection([makeRelease(1)]));
    mockSelect.mockReturnValue(drizzleChain([]));

    // First insert call throws a unique constraint error
    const dupChain = drizzleChain([]);
    (dupChain.values as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("unique constraint violation")
    );
    mockInsert.mockReturnValueOnce(dupChain);

    const result = await executeSync(() => {});
    expect(result.pulled).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it("records non-unique insert errors in errors array", async () => {
    mockGetUserCollection.mockResolvedValue(singlePageCollection([makeRelease(1)]));
    mockSelect.mockReturnValue(drizzleChain([]));

    const errChain = drizzleChain([]);
    (errChain.values as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("connection timeout")
    );
    mockInsert.mockReturnValueOnce(errChain);

    const result = await executeSync(() => {});
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Pull 1");
  });

  it("paginates through multiple pages", async () => {
    mockGetUserCollection
      .mockResolvedValueOnce({
        pagination: { page: 1, pages: 2, per_page: 1, items: 2 },
        releases: [makeRelease(1)],
      })
      .mockResolvedValueOnce({
        pagination: { page: 2, pages: 2, per_page: 1, items: 2 },
        releases: [makeRelease(2)],
      });
    mockSelect.mockReturnValue(drizzleChain([]));

    const result = await executeSync(() => {});
    expect(result.pulled).toBe(2);
    expect(mockGetUserCollection).toHaveBeenCalledTimes(2);
  });

  it("reports totalDiscogsItems from pagination", async () => {
    mockGetUserCollection.mockResolvedValue({
      pagination: { page: 1, pages: 1, per_page: 100, items: 42 },
      releases: [],
    });

    const result = await executeSync(() => {});
    expect(result.totalDiscogsItems).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// Progress callbacks
// ---------------------------------------------------------------------------

describe("executeSync — progress callbacks", () => {
  it("fires callback with pull then done phases in order", async () => {
    mockGetUserCollection.mockResolvedValue(singlePageCollection([]));
    mockSelect.mockReturnValue(drizzleChain([]));

    const phases: string[] = [];
    await executeSync((p) => phases.push(p.phase));

    expect(phases).toContain("pull");
    expect(phases).not.toContain("push");
    expect(phases[phases.length - 1]).toBe("done");
  });

  it("returns the final SyncProgress object", async () => {
    mockGetUserCollection.mockResolvedValue(singlePageCollection([]));
    mockSelect.mockReturnValue(drizzleChain([]));

    const result = await executeSync(() => {});
    expect(result).toMatchObject({
      phase: "done",
      pulled: expect.any(Number),
      updated: expect.any(Number),
      skipped: expect.any(Number),
      errors: expect.any(Array),
      totalDiscogsItems: expect.any(Number),
    });
  });
});
