import { describe, expect, it } from "vitest";
import {
  artistSortKey,
  compareRecords,
  effectiveSize,
  escapeHtml,
  filterRecords,
  parseSseChunk,
  paginateRecords,
  sortRecords,
  cardActionVisibility,
  CARD_SCALE,
  CARD_WIDTH,
  FLIPPED_CARD_WIDTH,
  FRONT_ART_SIZE,
  BACK_ART_SIZE,
  FLIPPED_CARD_EXTRA_WIDTH,
  type BrowserRecord,
} from "@/src/scripts/record-helpers";

const baseRecord: BrowserRecord = {
  recordId: "1",
  artistName: "The Beatles",
  albumTitle: "Abbey Road",
  yearReleased: 1969,
  labelName: null,
  catalogNumber: "PCS 7088",
  discogsId: "1",
  discogsUri: null,
  isSyncedWithDiscogs: false,
  thumbnailUrl: null,
  coverImageUrl: null,
  genres: ["Rock"],
  styles: [],
  upcCode: null,
  recordSize: null,
  vinylColor: null,
  isShapedVinyl: false,
  dataSource: "discogs",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function makeRecord(overrides: Partial<BrowserRecord>): BrowserRecord {
  return { ...baseRecord, ...overrides };
}

describe("record helpers", () => {
  it("escapes HTML-sensitive characters", () => {
    expect(escapeHtml('<img alt="Motörhead & more">')).toBe("&lt;img alt=&quot;Motörhead &amp; more&quot;&gt;");
  });

  it("normalizes artist sort keys", () => {
    expect(artistSortKey("The Beatles")).toBe("beatles");
    expect(artistSortKey("Água Viva")).toBe("agua viva");
  });

  it("falls back to 12 inch size unless shaped", () => {
    expect(effectiveSize(makeRecord({ recordSize: null, isShapedVinyl: false }))).toBe('12"');
    expect(effectiveSize(makeRecord({ recordSize: null, isShapedVinyl: true }))).toBe("Unknown");
  });

  it("filters by size and shaped status", () => {
    const records = [
      makeRecord({ recordId: "1", recordSize: '7"', isShapedVinyl: false }),
      makeRecord({ recordId: "2", recordSize: '12"', isShapedVinyl: true }),
    ];

    const filtered = filterRecords(records, new Set(['12"']), true);
    expect(filtered.map((record) => record.recordId)).toEqual(["2"]);
  });

  it("sorts records by artist with year as secondary key", () => {
    const records = [
      makeRecord({ recordId: "2", artistName: "The Beatles", yearReleased: 1970 }),
      makeRecord({ recordId: "1", artistName: "The Beatles", yearReleased: 1969 }),
      makeRecord({ recordId: "3", artistName: "Björk", yearReleased: 1995 }),
    ];

    expect(sortRecords(records, "artist", true).map((record) => record.recordId)).toEqual(["1", "2", "3"]);
  });

  it("compares records by title", () => {
    const first = makeRecord({ albumTitle: "A" });
    const second = makeRecord({ albumTitle: "B" });
    expect(compareRecords(first, second, "title", true)).toBeLessThan(0);
  });

  it("paginates records using a safe page", () => {
    const records = [
      makeRecord({ recordId: "1" }),
      makeRecord({ recordId: "2" }),
      makeRecord({ recordId: "3" }),
    ];

    expect(paginateRecords(records, 2, 2).pageRecords.map((record) => record.recordId)).toEqual(["3"]);
    expect(paginateRecords(records, 2, 99).safePage).toBe(2);
  });

  it("parses complete SSE chunks and returns remainder", () => {
    const parsed = parseSseChunk('data: {"phase":"pull"}\n\ndata: {"phase":"done"}\n\npartial');
    expect(parsed.events).toEqual([{ phase: "pull" }, { phase: "done" }]);
    expect(parsed.remainder).toBe("partial");
  });

  it("defines card dimensions while preserving art sizes", () => {
    expect(CARD_SCALE).toBe(1.5);
    expect(CARD_WIDTH).toBe(237);
    expect(FLIPPED_CARD_WIDTH).toBe(347);
    expect(FRONT_ART_SIZE).toBe(216);
    expect(BACK_ART_SIZE).toBe(324);
    expect(FLIPPED_CARD_EXTRA_WIDTH).toBe(110);
  });

  it("hides delete confirmation until delete is requested", () => {
    expect(cardActionVisibility(false)).toEqual({
      confirmDeleteHidden: true,
      actionErrorHidden: true,
    });
    expect(cardActionVisibility(true)).toEqual({
      confirmDeleteHidden: false,
      actionErrorHidden: true,
    });
  });
});
