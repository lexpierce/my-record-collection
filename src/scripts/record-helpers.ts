import { artistSortKey as normalizeArtistSortKey } from "@/lib/pagination/buckets";

export const CARD_SCALE = 1.5;
export const CARD_WIDTH = 270;
export const FLIPPED_CARD_WIDTH = 375;
export const FRONT_ART_SIZE = 216;
export const BACK_ART_SIZE = 324;
export const FLIPPED_CARD_EXTRA_WIDTH = FLIPPED_CARD_WIDTH - CARD_WIDTH;

export type SortBy = "artist" | "title" | "year";

export interface BrowserRecord {
  recordId: string;
  artistName: string;
  albumTitle: string;
  yearReleased: number | null;
  labelName: string | null;
  catalogNumber: string | null;
  discogsId: string | null;
  discogsUri: string | null;
  isSyncedWithDiscogs: boolean;
  thumbnailUrl: string | null;
  coverImageUrl: string | null;
  genres: string[] | null;
  styles: string[] | null;
  upcCode: string | null;
  recordSize: string | null;
  vinylColor: string | null;
  isShapedVinyl: boolean | null;
  dataSource: string;
  createdAt: string;
  updatedAt: string;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function artistSortKey(artistName: string): string {
  return normalizeArtistSortKey(artistName).toLowerCase();
}

export function effectiveSize(record: BrowserRecord): string {
  return record.recordSize || (record.isShapedVinyl ? "Unknown" : '12"');
}

export function filterRecords(
  records: BrowserRecord[],
  sizeFilter: Set<string>,
  shapedOnly: boolean,
): BrowserRecord[] {
  return records.filter((record) => {
    if (sizeFilter.size > 0 && !sizeFilter.has(effectiveSize(record))) return false;
    if (shapedOnly && !record.isShapedVinyl) return false;
    return true;
  });
}

export function compareRecords(
  first: BrowserRecord,
  second: BrowserRecord,
  sortBy: SortBy,
  sortAsc: boolean,
): number {
  const direction = sortAsc ? 1 : -1;

  if (sortBy === "artist") {
    const artistComparison = artistSortKey(first.artistName).localeCompare(
      artistSortKey(second.artistName),
    );
    if (artistComparison !== 0) return artistComparison * direction;
    return ((first.yearReleased ?? 9999) - (second.yearReleased ?? 9999)) * direction;
  }

  if (sortBy === "title") {
    return first.albumTitle.localeCompare(second.albumTitle) * direction;
  }

  return ((second.yearReleased ?? 0) - (first.yearReleased ?? 0)) * direction;
}

export function sortRecords(
  records: BrowserRecord[],
  sortBy: SortBy,
  sortAsc: boolean,
): BrowserRecord[] {
  return [...records].sort((first, second) => compareRecords(first, second, sortBy, sortAsc));
}

export function paginateRecords(
  records: BrowserRecord[],
  pageSize: number,
  currentPage: number,
): { pageRecords: BrowserRecord[]; totalPages: number; safePage: number } {
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const pageStart = (safePage - 1) * pageSize;
  return {
    pageRecords: records.slice(pageStart, pageStart + pageSize),
    totalPages,
    safePage,
  };
}

export function uniqueEffectiveSizes(records: BrowserRecord[]): string[] {
  return [...new Set(records.map(effectiveSize))].sort();
}

export function parseSseChunk(buffer: string): { events: unknown[]; remainder: string } {
  const chunks = buffer.split("\n\n");
  const remainder = chunks.pop() || "";
  const events = chunks
    .map((chunk) => chunk.replace(/^data: /, ""))
    .filter(Boolean)
    .map((chunk) => {
      try {
        return JSON.parse(chunk) as unknown;
      } catch {
        return null;
      }
    })
    .filter((event): event is unknown => event !== null);

  return { events, remainder };
}
