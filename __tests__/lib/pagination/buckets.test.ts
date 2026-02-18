/**
 * Tests for lib/pagination/buckets.ts
 *
 * Covers artistSortKey normalisation and computeBuckets grouping/splitting/merging.
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

  it("merges sparse records across letters into a range bucket", () => {
    // Only 3 records across B, N, R — all fit in one merged page
    const records = [r("Nirvana", "n1"), r("Björk", "b1"), r("Radiohead", "r1")];
    const sorted = [...records].sort((a, b) =>
      artistSortKey(a.artistName).localeCompare(artistSortKey(b.artistName)),
    );
    const buckets = computeBuckets(sorted);
    // All 3 fit under maxSize=50 → merged into one bucket
    expect(buckets).toHaveLength(1);
    expect(buckets[0].recordIds).toHaveLength(3);
    // Label should be a range "B–R"
    expect(buckets[0].label).toBe("B\u2013R");
  });

  it("places 'The Beatles' in B bucket", () => {
    const records = [r("The Beatles", "b1"), r("Nirvana", "n1")];
    const sorted = [...records].sort((a, b) =>
      artistSortKey(a.artistName).localeCompare(artistSortKey(b.artistName)),
    );
    const buckets = computeBuckets(sorted);
    // Both fit under maxSize → merged; label covers B through N
    const allIds = buckets.flatMap((b) => b.recordIds);
    expect(allIds).toContain("b1");
  });

  it("places non-alpha starters in # bucket", () => {
    const records2 = [r("1975", "num1"), r("Nirvana", "n1")];
    const sorted2 = [...records2].sort((a, b) =>
      artistSortKey(a.artistName).localeCompare(artistSortKey(b.artistName)),
    );
    const buckets2 = computeBuckets(sorted2);
    const hash = buckets2.find((b) => b.label === "#");
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
// computeBuckets — splitting oversized letters
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
    // 6 records all starting with B but different second chars, maxSize=2
    const records = [
      r("Ba-artist", "ba1"),
      r("Ba-artist2", "ba2"),
      r("Bb-artist", "bb1"),
      r("Bc-artist", "bc1"),
      r("Bd-artist", "bd1"),
      r("Be-artist", "be1"),
    ];
    const buckets = computeBuckets(records, 2);
    // All sub-buckets start with B
    expect(buckets.every((b) => b.label.startsWith("B"))).toBe(true);
    // No single bucket should have > 2 records
    expect(buckets.every((b) => b.recordIds.length <= 2)).toBe(true);
    // Total records preserved
    const total = buckets.reduce((sum, b) => sum + b.recordIds.length, 0);
    expect(total).toBe(6);
  });

  it("uses default MAX_BUCKET_SIZE constant (49 records = one bucket)", () => {
    const records = Array.from({ length: MAX_BUCKET_SIZE - 1 }, (_, i) =>
      r(`Band${i}`, `id${i}`),
    );
    const buckets = computeBuckets(records);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].label).toBe("B");
  });
});

// ---------------------------------------------------------------------------
// computeBuckets — merging small adjacent pages
// ---------------------------------------------------------------------------

describe("computeBuckets — merging", () => {
  it("merges adjacent letter pages when combined count <= maxSize", () => {
    // A=3, B=3, C=3 → all 9 fit under maxSize=10 → one page "A–C"
    const records = [
      r("Aaaa", "a1"), r("Aaab", "a2"), r("Aaac", "a3"),
      r("Baaa", "b1"), r("Baab", "b2"), r("Baac", "b3"),
      r("Caaa", "c1"), r("Caab", "c2"), r("Caac", "c3"),
    ];
    const buckets = computeBuckets(records, 10);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].label).toBe("A\u2013C");
    expect(buckets[0].recordIds).toHaveLength(9);
  });

  it("stops merging when next page would exceed maxSize", () => {
    // A=5, B=5, C=5 with maxSize=10: A+B=10 (ok), adding C=15 > 10 → flush A–B, then C alone
    const records = [
      ...Array.from({ length: 5 }, (_, i) => r(`Aart${i}`, `a${i}`)),
      ...Array.from({ length: 5 }, (_, i) => r(`Bart${i}`, `b${i}`)),
      ...Array.from({ length: 5 }, (_, i) => r(`Cart${i}`, `c${i}`)),
    ];
    const buckets = computeBuckets(records, 10);
    expect(buckets).toHaveLength(2);
    expect(buckets[0].label).toBe("A\u2013B");
    expect(buckets[0].recordIds).toHaveLength(10);
    expect(buckets[1].label).toBe("C");
    expect(buckets[1].recordIds).toHaveLength(5);
  });

  it("does not merge sub-buckets from a split letter with adjacent letter pages", () => {
    // B is split (exceeds maxSize=3), A and C are small
    // A and C should NOT merge with B's sub-buckets
    const records = [
      r("Aaaa", "a1"),
      r("Baa", "ba1"), r("Baa2", "ba2"), r("Bbb", "bb1"), r("Bbb2", "bb2"),
      r("Caaa", "c1"),
    ];
    const buckets = computeBuckets(records, 3);
    // B is split → sub-buckets Ba and Bb emitted as-is
    // A (1 record) should not merge with Ba–Bb group; C (1 record) should not merge across
    // A flushes before B's split sub-buckets, C is its own page after
    const labels = buckets.map((b) => b.label);
    expect(labels).toContain("A");
    expect(labels.some((l) => l.startsWith("B"))).toBe(true);
    expect(labels).toContain("C");
  });

  it("single-letter page with exactly one letter gets plain label, not range", () => {
    const records = Array.from({ length: 3 }, (_, i) => r(`Nirvana${i}`, `n${i}`));
    const buckets = computeBuckets(records, 10);
    expect(buckets[0].label).toBe("N");
  });

  it("preserves all record ids after merging", () => {
    const records = [
      ...Array.from({ length: 4 }, (_, i) => r(`Aart${i}`, `a${i}`)),
      ...Array.from({ length: 4 }, (_, i) => r(`Bart${i}`, `b${i}`)),
      ...Array.from({ length: 4 }, (_, i) => r(`Cart${i}`, `c${i}`)),
    ];
    const buckets = computeBuckets(records, 20);
    const total = buckets.reduce((sum, b) => sum + b.recordIds.length, 0);
    expect(total).toBe(12);
  });
});
