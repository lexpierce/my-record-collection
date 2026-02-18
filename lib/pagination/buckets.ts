/**
 * Alphabetical bucket computation for the RecordShelf nav bar.
 *
 * A "bucket" is a contiguous range of artists whose sort keys start with the
 * same letter (or second letter when a single letter exceeds MAX_BUCKET_SIZE).
 * Non-alpha starters are collected in the "#" bucket.
 *
 * Usage:
 *   const buckets = computeBuckets(sortedRecords);
 *   // buckets = [{ label: "#", recordIds: [...] }, { label: "A", ... }, ...]
 */

/** Maximum records per bucket before splitting by second letter. */
export const MAX_BUCKET_SIZE = 100;

export interface AlphaBucket {
  /** Display label shown in the nav bar, e.g. "A", "Ba–Bm", "#". */
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

/**
 * Compute alphabetical buckets from a pre-sorted list of records.
 *
 * Records must already be sorted by `artistSortKey` ascending so that
 * splitting by second letter produces contiguous sub-buckets.
 *
 * @param records  Array of objects with `recordId` and `artistName`.
 * @param maxSize  Threshold above which a letter is split by second letter.
 * @returns        Array of buckets in alphabetical order ("#" last).
 */
export function computeBuckets(
  records: { recordId: string; artistName: string }[],
  maxSize: number = MAX_BUCKET_SIZE,
): AlphaBucket[] {
  // Group by first character
  const byFirst = new Map<string, { recordId: string; artistName: string }[]>();
  for (const record of records) {
    const ch = firstChar(record.artistName);
    if (!byFirst.has(ch)) byFirst.set(ch, []);
    byFirst.get(ch)!.push(record);
  }

  const buckets: AlphaBucket[] = [];

  // Process letters A–Z in order, then "#"
  const letters = [...byFirst.keys()].sort((a, b) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b);
  });

  for (const letter of letters) {
    const group = byFirst.get(letter)!;

    if (group.length <= maxSize || letter === "#") {
      // Single bucket for this letter
      buckets.push({ label: letter, recordIds: group.map((r) => r.recordId) });
      continue;
    }

    // Split by second character into sub-buckets
    const bySecond = new Map<string, string[]>();
    for (const record of group) {
      const ch2 = secondChar(record.artistName);
      if (!bySecond.has(ch2)) bySecond.set(ch2, []);
      bySecond.get(ch2)!.push(record.recordId);
    }

    // Merge second-char groups into sub-buckets not exceeding maxSize
    const chars = [...bySecond.keys()].sort();
    let subIds: string[] = [];
    let startChar = chars[0];

    for (let i = 0; i < chars.length; i++) {
      const ch2 = chars[i];
      const ids = bySecond.get(ch2)!;

      if (subIds.length > 0 && subIds.length + ids.length > maxSize) {
        // Flush current sub-bucket
        const endChar = chars[i - 1];
        const label =
          startChar === endChar
            ? `${letter}${startChar}`
            : `${letter}${startChar}\u2013${letter}${endChar}`;
        buckets.push({ label, recordIds: subIds });
        subIds = [];
        startChar = ch2;
      }

      subIds.push(...ids);

      if (i === chars.length - 1) {
        // Flush last sub-bucket
        const label =
          startChar === ch2
            ? `${letter}${startChar}`
            : `${letter}${startChar}\u2013${letter}${ch2}`;
        buckets.push({ label, recordIds: subIds });
      }
    }
  }

  return buckets;
}
