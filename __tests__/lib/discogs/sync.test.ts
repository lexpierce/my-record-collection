/**
 * Tests for lib/discogs/sync.ts
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
  mockAddToCollection,
  mockExtractRecordSize,
  mockExtractVinylColor,
  mockIsShapedVinyl,
} = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockSelect: vi.fn(),
  mockGetUserCollection: vi.fn(),
  mockAddToCollection: vi.fn(),
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
    addToCollection: mockAddToCollection,
    extractRecordSize: mockExtractRecordSize,
    extractVinylColor: mockExtractVinylColor,
    isShapedVinyl: mockIsShapedVinyl,
  }),
}));

import { executeSync, type SyncProgress } from "@/lib/discogs/sync";

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
  // Default: addToCollection succeeds
  mockAddToCollection.mockResolvedValue(undefined);
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
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("skips releases already in local DB", async () => {
    mockGetUserCollection.mockResolvedValue(
      singlePageCollection([makeRelease(1), makeRelease(2)])
    );
    // Local DB already has release 1
    mockSelect.mockReturnValue(drizzleChain([{ discogsId: "1" }]));

    const result = await executeSync(() => {});
    expect(result.pulled).toBe(1);
    expect(result.skipped).toBe(1);
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
// Push phase
// ---------------------------------------------------------------------------

describe("executeSync — push phase", () => {
  it("calls addToCollection for local records not in Discogs collection", async () => {
    mockGetUserCollection.mockResolvedValue(singlePageCollection([]));
    // First select (pull phase existing IDs) = empty
    // Second select (push phase all local records) = one unsynced record not on Discogs
    mockSelect
      .mockReturnValueOnce(drizzleChain([]))
      .mockReturnValueOnce(drizzleChain([{ recordId: "uuid-1", discogsId: "99", isSyncedWithDiscogs: false }]));

    const result = await executeSync(() => {});
    expect(mockAddToCollection).toHaveBeenCalledWith("testuser", 99);
    expect(result.pushed).toBe(1);
  });

  it("skips records already flagged isSyncedWithDiscogs", async () => {
    mockGetUserCollection.mockResolvedValue(singlePageCollection([]));
    mockSelect
      .mockReturnValueOnce(drizzleChain([]))
      .mockReturnValueOnce(drizzleChain([{ recordId: "uuid-1", discogsId: "99", isSyncedWithDiscogs: true }]));

    const result = await executeSync(() => {});
    expect(mockAddToCollection).not.toHaveBeenCalled();
    expect(result.pushed).toBe(0);
  });

  it("handles 409 from addToCollection as a successful push", async () => {
    mockGetUserCollection.mockResolvedValue(singlePageCollection([]));
    mockSelect
      .mockReturnValueOnce(drizzleChain([]))
      .mockReturnValueOnce(drizzleChain([{ recordId: "uuid-1", discogsId: "99", isSyncedWithDiscogs: false }]));

    const conflict = Object.assign(new Error("Conflict"), { status: 409 });
    mockAddToCollection.mockRejectedValueOnce(conflict);

    const result = await executeSync(() => {});
    expect(result.pushed).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it("adds non-409 addToCollection errors to errors array", async () => {
    mockGetUserCollection.mockResolvedValue(singlePageCollection([]));
    mockSelect
      .mockReturnValueOnce(drizzleChain([]))
      .mockReturnValueOnce(drizzleChain([{ recordId: "uuid-1", discogsId: "99", isSyncedWithDiscogs: false }]));

    mockAddToCollection.mockRejectedValueOnce(new Error("rate limit exceeded"));

    const result = await executeSync(() => {});
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Push 99");
  });

  it("does not push records without a discogsId", async () => {
    mockGetUserCollection.mockResolvedValue(singlePageCollection([]));
    mockSelect
      .mockReturnValueOnce(drizzleChain([]))
      .mockReturnValueOnce(drizzleChain([{ recordId: "uuid-1", discogsId: null, isSyncedWithDiscogs: false }]));

    const result = await executeSync(() => {});
    expect(mockAddToCollection).not.toHaveBeenCalled();
    expect(result.pushed).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Progress callbacks
// ---------------------------------------------------------------------------

describe("executeSync — progress callbacks", () => {
  it("fires callback with pull, push, done phases in order", async () => {
    mockGetUserCollection.mockResolvedValue(singlePageCollection([]));
    mockSelect.mockReturnValue(drizzleChain([]));

    const phases: string[] = [];
    await executeSync((p) => phases.push(p.phase));

    expect(phases).toContain("pull");
    expect(phases).toContain("push");
    expect(phases[phases.length - 1]).toBe("done");
  });

  it("returns the final SyncProgress object", async () => {
    mockGetUserCollection.mockResolvedValue(singlePageCollection([]));
    mockSelect.mockReturnValue(drizzleChain([]));

    const result = await executeSync(() => {});
    expect(result).toMatchObject({
      phase: "done",
      pulled: expect.any(Number),
      pushed: expect.any(Number),
      skipped: expect.any(Number),
      errors: expect.any(Array),
      totalDiscogsItems: expect.any(Number),
    });
  });
});
