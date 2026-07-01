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

/** Sort keys in order A–Z then "#" last. */
function compareLetters(a: string, b: string): number {
  if (a === "#") return 1;
  if (b === "#") return -1;
  return a.localeCompare(b);
}

/**
 * Split an oversized letter group into 2-char-labelled sub-buckets by second
 * character, each capped at `maxSize`.
 */
function splitOversizedGroup(
  letter: string,
  group: { recordId: string; artistName: string }[],
  maxSize: number,
): RawPage[] {
  const bySecond = new Map<string, string[]>();
  for (const record of group) {
    bySecond.getOrInsertComputed(secondChar(record.artistName), () => []).push(record.recordId);
  }

  const chars = [...bySecond.keys()].sort();
  const pages: RawPage[] = [];
  let subIds: string[] = [];
  let startChar = chars[0];

  const flushSubPage = (endChar: string) => {
    const label =
      startChar === endChar
        ? `${letter}${startChar}`
        : `${letter}${startChar}\u2013${letter}${endChar}`;
    pages.push({ firstLetter: letter, isSplit: true, baseLabel: label, recordIds: subIds });
  };

  for (let i = 0; i < chars.length; i++) {
    const ch2 = chars[i];
    const ids = bySecond.get(ch2)!;

    if (subIds.length > 0 && subIds.length + ids.length > maxSize) {
      flushSubPage(chars[i - 1]);
      subIds = [];
      startChar = ch2;
    }

    subIds.push(...ids);
    if (i === chars.length - 1) flushSubPage(ch2);
  }

  return pages;
}

/** Pass 1: group records by first letter, splitting oversized letters. */
function buildRawPages(
  records: { recordId: string; artistName: string }[],
  maxSize: number,
): RawPage[] {
  const byFirst = Map.groupBy(records, (record) => firstChar(record.artistName));
  const letters = [...byFirst.keys()].sort(compareLetters);
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

    rawPages.push(...splitOversizedGroup(letter, group, maxSize));
  }

  return rawPages;
}

/**
 * Pass 2: merge adjacent non-split, non-# pages.
 *
 * Merges greedily: accumulates pages until the next one would push us over
 * maxSize, then flushes. Never merges across:
 *   - the "#" bucket
 *   - sub-buckets that came from a split letter (they already have 2-char labels)
 *   - a split-letter group with its neighbours from other letters
 */
function mergeRawPages(rawPages: RawPage[], maxSize: number): AlphaBucket[] {
  const buckets: AlphaBucket[] = [];
  const hashPage = rawPages.find((p) => p.firstLetter === "#");
  const letterPages = rawPages.filter((p) => p.firstLetter !== "#");

  let mergeIds: string[] = [];
  let mergeStart: RawPage | null = null;
  let mergeLast: RawPage | null = null;

  const flushMerge = () => {
    if (mergeIds.length === 0) return;
    const startLetter = mergeStart!.baseLabel;
    const endLetter = mergeLast!.baseLabel;
    const label = startLetter === endLetter ? startLetter : `${startLetter}\u2013${endLetter}`;
    buckets.push({ label, recordIds: mergeIds });
    mergeIds = [];
    mergeStart = null;
    mergeLast = null;
  };

  for (const page of letterPages) {
    if (page.isSplit) {
      flushMerge();
      buckets.push({ label: page.baseLabel, recordIds: page.recordIds });
      continue;
    }

    if (mergeIds.length + page.recordIds.length > maxSize && mergeIds.length > 0) {
      flushMerge();
    }

    mergeIds.push(...page.recordIds);
    if (mergeStart === null) mergeStart = page;
    mergeLast = page;
  }

  flushMerge();

  if (hashPage) {
    buckets.push({ label: "#", recordIds: hashPage.recordIds });
  }

  return buckets;
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
  const rawPages = buildRawPages(records, maxSize);
  return mergeRawPages(rawPages, maxSize);
}
