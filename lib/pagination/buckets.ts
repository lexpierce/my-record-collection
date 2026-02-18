/**
 * Alphabetical bucket computation for the RecordShelf nav bar.
 *
 * A "bucket" is a page of records described by the range of artist sort-key
 * letters it covers. Pages are built in two passes:
 *
 *   Pass 1 — split oversized letters:
 *     Group by first letter. Any letter-group with more than MAX_BUCKET_SIZE
 *     records is split into sub-buckets by second letter. Sub-bucket labels
 *     look like "Ba–Bm". Non-alpha starters land in "#" (never split).
 *
 *   Pass 2 — merge small adjacent pages:
 *     Walk the flat page list (excluding "#") and greedily merge adjacent pages
 *     until adding the next would exceed MAX_BUCKET_SIZE. Merged pages get a
 *     range label like "A–C". Sub-buckets that came from a split letter are
 *     never merged with pages from a different first-letter group.
 *
 * Usage:
 *   const buckets = computeBuckets(sortedRecords);
 *   // e.g. [{ label: "A–C", recordIds: [...] }, { label: "Ba–Bm", ... }, ...]
 */

/** Maximum records per bucket / page. */
export const MAX_BUCKET_SIZE = 50;

export interface AlphaBucket {
  /** Display label shown in the nav bar, e.g. "A–C", "Ba–Bm", "#". */
  label: string;
  /** recordId values of every record in this bucket. */
  recordIds: string[];
}

/**
 * Normalise an artist name to its sort key — strips diacritics, leading
 * articles ("The ", "A "), and leading non-alphanumeric characters.
 *
 * This must stay in sync with the equivalent function in RecordShelf.tsx.
 */
export function artistSortKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^(The|A)\s+/i, "")
    .replace(/^[^a-zA-Z0-9]+/, "");
}

/**
 * Return the first character of the artist sort key, upper-cased.
 * Non-alpha characters → "#".
 */
function firstChar(name: string): string {
  const key = artistSortKey(name);
  const ch = key.charAt(0).toUpperCase();
  return /^[A-Z]$/.test(ch) ? ch : "#";
}

/**
 * Return the second character of the artist sort key, upper-cased.
 * Falls back to "" when the key is a single character.
 */
function secondChar(name: string): string {
  const key = artistSortKey(name);
  return key.length > 1 ? key.charAt(1).toUpperCase() : "";
}

/** Internal intermediate page before the merge pass. */
interface RawPage {
  /** First letter this page belongs to (for merge-boundary detection). */
  firstLetter: string;
  /** True when this page is a sub-bucket of a split letter — never merge across letter boundaries. */
  isSplit: boolean;
  /** Display label before possible merge (e.g. "A", "Ba–Bm"). */
  baseLabel: string;
  recordIds: string[];
}

/**
 * Compute alphabetical buckets from a pre-sorted list of records.
 *
 * Records must already be sorted by `artistSortKey` ascending so that
 * splitting by second letter produces contiguous sub-buckets.
 *
 * @param records  Array of objects with `recordId` and `artistName`.
 * @param maxSize  Threshold above which a letter is split, and below which
 *                 adjacent pages are merged.
 * @returns        Array of buckets in alphabetical order ("#" last).
 */
export function computeBuckets(
  records: { recordId: string; artistName: string }[],
  maxSize: number = MAX_BUCKET_SIZE,
): AlphaBucket[] {
  if (records.length === 0) return [];

  // ── Pass 0: group by first character ──────────────────────────────────────
  const byFirst = new Map<string, { recordId: string; artistName: string }[]>();
  for (const record of records) {
    const ch = firstChar(record.artistName);
    if (!byFirst.has(ch)) byFirst.set(ch, []);
    byFirst.get(ch)!.push(record);
  }

  // Letters in order A–Z then "#"
  const letters = [...byFirst.keys()].sort((a, b) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b);
  });

  // ── Pass 1: build raw pages, splitting oversized letters ──────────────────
  const rawPages: RawPage[] = [];

  for (const letter of letters) {
    const group = byFirst.get(letter)!;

    if (letter === "#" || group.length <= maxSize) {
      rawPages.push({
        firstLetter: letter,
        isSplit: false,
        baseLabel: letter,
        recordIds: group.map((r) => r.recordId),
      });
      continue;
    }

    // Split by second character
    const bySecond = new Map<string, string[]>();
    for (const record of group) {
      const ch2 = secondChar(record.artistName);
      if (!bySecond.has(ch2)) bySecond.set(ch2, []);
      bySecond.get(ch2)!.push(record.recordId);
    }

    const chars = [...bySecond.keys()].sort();
    let subIds: string[] = [];
    let startChar = chars[0];

    for (let i = 0; i < chars.length; i++) {
      const ch2 = chars[i];
      const ids = bySecond.get(ch2)!;

      if (subIds.length > 0 && subIds.length + ids.length > maxSize) {
        const endChar = chars[i - 1];
        const label =
          startChar === endChar
            ? `${letter}${startChar}`
            : `${letter}${startChar}\u2013${letter}${endChar}`;
        rawPages.push({ firstLetter: letter, isSplit: true, baseLabel: label, recordIds: subIds });
        subIds = [];
        startChar = ch2;
      }

      subIds.push(...ids);

      if (i === chars.length - 1) {
        const label =
          startChar === ch2
            ? `${letter}${startChar}`
            : `${letter}${startChar}\u2013${letter}${ch2}`;
        rawPages.push({ firstLetter: letter, isSplit: true, baseLabel: label, recordIds: subIds });
      }
    }
  }

  // ── Pass 2: merge adjacent non-split, non-# pages ─────────────────────────
  // We merge greedily: accumulate pages until the next one would push us over
  // maxSize, then flush. We never merge across:
  //   - the "#" bucket
  //   - sub-buckets that came from a split letter (they already have 2-char labels)
  //   - a split-letter group with its neighbours from other letters

  const buckets: AlphaBucket[] = [];

  // Separate # from the rest
  const hashPage = rawPages.find((p) => p.firstLetter === "#");
  const letterPages = rawPages.filter((p) => p.firstLetter !== "#");

  // Group letter pages by whether they are part of a split letter.
  // A run of pages all from the same split letter stays together but is never
  // merged with pages from a different letter. Non-split pages from different
  // letters CAN be merged.
  //
  // Strategy: treat each "split-letter group" as an atomic block that is
  // flushed as-is, and only merge across consecutive non-split pages.

  let mergeIds: string[] = [];
  let mergeStart: RawPage | null = null;
  let mergeLast: RawPage | null = null;

  function flushMerge() {
    if (mergeIds.length === 0) return;
    const startLetter = mergeStart!.baseLabel;
    const endLetter = mergeLast!.baseLabel;
    const label = startLetter === endLetter ? startLetter : `${startLetter}\u2013${endLetter}`;
    buckets.push({ label, recordIds: mergeIds });
    mergeIds = [];
    mergeStart = null;
    mergeLast = null;
  }

  for (const page of letterPages) {
    if (page.isSplit) {
      // Flush any pending merge first, then emit split sub-buckets as-is
      flushMerge();
      buckets.push({ label: page.baseLabel, recordIds: page.recordIds });
      continue;
    }

    // Non-split page — try to merge
    if (mergeIds.length + page.recordIds.length > maxSize && mergeIds.length > 0) {
      flushMerge();
    }

    mergeIds.push(...page.recordIds);
    if (mergeStart === null) mergeStart = page;
    mergeLast = page;
  }

  flushMerge();

  // Always append # last
  if (hashPage) {
    buckets.push({ label: "#", recordIds: hashPage.recordIds });
  }

  return buckets;
}
