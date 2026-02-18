/**
 * Tests for lib/pagination/buckets.ts
 *
 * Covers artistSortKey normalisation and computeBuckets grouping/splitting.
 */

import { describe, it, expect } from "vitest";
import { artistSortKey, computeBuckets, MAX_BUCKET_SIZE } from "@/lib/pagination/buckets";

// ---------------------------------------------------------------------------
// artistSortKey
// ---------------------------------------------------------------------------

describe("artistSortKey", () => {
  it("strips diacritics", () => {
    expect(artistSortKey("Björk")).toBe("Bjork");
    expect(artistSortKey("Motörhead")).toBe("Motorhead");
    expect(artistSortKey("Sigur Rós")).toBe("Sigur Ros");
  });

  it("strips leading 'The '", () => {
    expect(artistSortKey("The Beatles")).toBe("Beatles");
    expect(artistSortKey("THE CURE")).toBe("CURE");
  });

  it("strips leading 'A '", () => {
    expect(artistSortKey("A Tribe Called Quest")).toBe("Tribe Called Quest");
  });

  it("does not strip 'A' that is part of a word", () => {
    // "Arcade Fire" — "A" followed by non-space should remain
    expect(artistSortKey("Arcade Fire")).toBe("Arcade Fire");
  });

  it("strips leading non-alphanumeric characters", () => {
    expect(artistSortKey("!!The Band")).toBe("The Band");
  });

  it("leaves normal names untouched", () => {
    expect(artistSortKey("Nirvana")).toBe("Nirvana");
    expect(artistSortKey("Radiohead")).toBe("Radiohead");
  });
});

// ---------------------------------------------------------------------------
// computeBuckets — basic grouping
// ---------------------------------------------------------------------------

function r(artistName: string, recordId = artistName) {
  return { recordId, artistName };
}

describe("computeBuckets — basic", () => {
  it("returns empty array for empty input", () => {
    expect(computeBuckets([])).toEqual([]);
  });

  it("groups records by first letter of sort key", () => {
    const records = [r("Nirvana", "n1"), r("Björk", "b1"), r("Radiohead", "r1")];
    // Pre-sorted alphabetically by artistSortKey
    const sorted = [...records].sort((a, b) =>
      artistSortKey(a.artistName).localeCompare(artistSortKey(b.artistName)),
    );
    const buckets = computeBuckets(sorted);
    const labels = buckets.map((b) => b.label);
    expect(labels).toContain("B");
    expect(labels).toContain("N");
    expect(labels).toContain("R");
  });

  it("places 'The Beatles' in B bucket", () => {
    const records = [r("The Beatles", "b1"), r("Nirvana", "n1")];
    const sorted = [...records].sort((a, b) =>
      artistSortKey(a.artistName).localeCompare(artistSortKey(b.artistName)),
    );
    const buckets = computeBuckets(sorted);
    const bBucket = buckets.find((b) => b.label === "B");
    expect(bBucket).toBeDefined();
    expect(bBucket!.recordIds).toContain("b1");
  });

  it("places non-alpha starters in # bucket", () => {
    const records = [r("!!At the Drive-In", "id1"), r("Nirvana", "n1")];
    const sorted = [...records].sort((a, b) =>
      artistSortKey(a.artistName).localeCompare(artistSortKey(b.artistName)),
    );
    const buckets = computeBuckets(sorted);
    const hashBucket = buckets.find((b) => b.label === "#");
    // "!!At the Drive-In" → strip leading !! → "At the Drive-In" → strip "At " → "the Drive-In"
    // Actually: strips leading non-alphanum first, then "A " prefix
    // "!!At..." → "At the Drive-In" → strips "A " prefix is only "A " (with space), not "At "
    // So sort key = "At the Drive-In", first char = "A" → goes in A bucket, not #
    // Let's use a truly non-alpha starter after normalisation
    // Using a record whose sort key starts with a digit
    const records2 = [r("1975", "num1"), r("Nirvana", "n1")];
    const sorted2 = [...records2].sort((a, b) =>
      artistSortKey(a.artistName).localeCompare(artistSortKey(b.artistName)),
    );
    const buckets2 = computeBuckets(sorted2);
    const hash = buckets2.find((b) => b.label === "#");
    // "1975" starts with digit — should be #
    expect(hash).toBeDefined();
    expect(hash!.recordIds).toContain("num1");
  });

  it("# bucket comes last", () => {
    const records = [r("1975", "num1"), r("Björk", "b1"), r("Arca", "a1")];
    const sorted = [...records].sort((a, b) =>
      artistSortKey(a.artistName).localeCompare(artistSortKey(b.artistName)),
    );
    const buckets = computeBuckets(sorted);
    const lastLabel = buckets[buckets.length - 1].label;
    expect(lastLabel).toBe("#");
  });
});

// ---------------------------------------------------------------------------
// computeBuckets — splitting
// ---------------------------------------------------------------------------

describe("computeBuckets — splitting", () => {
  it("does not split a letter under maxSize", () => {
    const records = Array.from({ length: 5 }, (_, i) =>
      r(`Band${i}`, `id${i}`),
    );
    const buckets = computeBuckets(records, 10);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].label).toBe("B");
    expect(buckets[0].recordIds).toHaveLength(5);
  });

  it("splits a letter that exceeds maxSize", () => {
    // 6 records all starting with B but different second chars
    const records = [
      r("Ba-artist", "ba1"),
      r("Ba-artist2", "ba2"),
      r("Bb-artist", "bb1"),
      r("Bc-artist", "bc1"),
      r("Bd-artist", "bd1"),
      r("Be-artist", "be1"),
    ];
    // maxSize = 2 → should produce multiple sub-buckets
    const buckets = computeBuckets(records, 2);
    // All should start with B
    expect(buckets.every((b) => b.label.startsWith("B"))).toBe(true);
    // No single bucket should have > 2 records
    expect(buckets.every((b) => b.recordIds.length <= 2)).toBe(true);
    // Total records preserved
    const total = buckets.reduce((sum, b) => sum + b.recordIds.length, 0);
    expect(total).toBe(6);
  });

  it("uses default MAX_BUCKET_SIZE constant", () => {
    // Under the default threshold — all B records in one bucket
    const records = Array.from({ length: MAX_BUCKET_SIZE - 1 }, (_, i) =>
      r(`Band${i}`, `id${i}`),
    );
    const buckets = computeBuckets(records);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].label).toBe("B");
  });
});
