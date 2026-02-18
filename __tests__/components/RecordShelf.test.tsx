/**
 * Tests for components/records/RecordShelf.tsx
 *
 * fetch is mocked so no real API calls are made.
 * RecordCard is mocked to a simple stub to isolate shelf logic.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecordShelf from "@/components/records/RecordShelf";
import type { Record } from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Stub RecordCard to avoid deep rendering and fetch interactions
vi.mock("@/components/records/RecordCard", () => ({
  default: ({ record }: { record: Record }) => (
    <div data-testid="record-card">{record.albumTitle}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

function makeRecord(overrides: Partial<Record>): Record {
  return {
    recordId: `uuid-${Math.random()}`,
    artistName: "Artist",
    albumTitle: "Album",
    yearReleased: 2000,
    labelName: null,
    catalogNumber: null,
    discogsId: null,
    discogsUri: null,
    thumbnailUrl: null,
    coverImageUrl: null,
    genres: [],
    styles: [],
    upcCode: null,
    recordSize: '12"',
    vinylColor: null,
    isShapedVinyl: false,
    dataSource: "discogs",
    isSyncedWithDiscogs: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const records: Record[] = [
  makeRecord({ artistName: "Nirvana", albumTitle: "Nevermind", yearReleased: 1991, recordSize: '12"' }),
  makeRecord({ artistName: "The Beatles", albumTitle: "Abbey Road", yearReleased: 1969, recordSize: '12"' }),
  makeRecord({ artistName: "Radiohead", albumTitle: "OK Computer", yearReleased: 1997, recordSize: '7"' }),
];

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const fetchSpy = vi.spyOn(globalThis, "fetch");

function mockFetchOk(data: Record[]) {
  fetchSpy.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ records: data }),
  } as Response);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchOk(records);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RecordShelf — rendering", () => {
  it("shows loading spinner initially", () => {
    render(<RecordShelf />);
    // Loading state is shown before fetch resolves
    // The spinner div exists in the DOM
    expect(document.querySelector(".spinner") ?? screen.queryByText(/Loading/i)).toBeTruthy();
  });

  it("renders all records after fetch", async () => {
    render(<RecordShelf />);
    await waitFor(() => {
      expect(screen.getAllByTestId("record-card")).toHaveLength(3);
    });
  });

  it("shows record count", async () => {
    render(<RecordShelf />);
    await waitFor(() => {
      expect(screen.getByText(/3 records/i)).toBeInTheDocument();
    });
  });

  it("shows '1 record' (singular) when only one record", async () => {
    mockFetchOk([records[0]]);
    render(<RecordShelf />);
    await waitFor(() => {
      expect(screen.getByText("1 record")).toBeInTheDocument();
    });
  });

  it("shows error message when fetch fails", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "DB error" }),
    } as Response);
    render(<RecordShelf />);
    await waitFor(() => {
      expect(screen.getByText("DB error")).toBeInTheDocument();
    });
  });

  it("shows empty state when no records", async () => {
    mockFetchOk([]);
    render(<RecordShelf />);
    await waitFor(() => {
      expect(screen.getByText(/empty/i)).toBeInTheDocument();
    });
  });
});

describe("RecordShelf — refreshKey", () => {
  it("re-fetches when refreshKey changes", async () => {
    const { rerender } = render(<RecordShelf refreshKey={0} />);
    await waitFor(() => screen.getAllByTestId("record-card"));

    rerender(<RecordShelf refreshKey={1} />);
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});

describe("RecordShelf — sorting", () => {
  it("changes sort to title when Title is selected", async () => {
    render(<RecordShelf />);
    await waitFor(() => screen.getAllByTestId("record-card"));

    const select = screen.getByRole("combobox", { name: "Sort by" });
    fireEvent.change(select, { target: { value: "title" } });

    // All cards still shown
    expect(screen.getAllByTestId("record-card")).toHaveLength(3);
  });

  it("toggles sort direction when direction button is clicked", async () => {
    render(<RecordShelf />);
    await waitFor(() => screen.getAllByTestId("record-card"));

    const dirBtn = screen.getByRole("button", { name: /sort ascending|sort descending/i });
    fireEvent.click(dirBtn);
    // Still shows all records
    expect(screen.getAllByTestId("record-card")).toHaveLength(3);
  });
});

describe("RecordShelf — filtering", () => {
  it("shows filter dropdown when filter button is clicked", async () => {
    render(<RecordShelf />);
    await waitFor(() => screen.getAllByTestId("record-card"));

    const filterBtn = screen.getByRole("button", { name: /filter records/i });
    fireEvent.click(filterBtn);

    // Size checkboxes appear
    expect(screen.getByText('12"')).toBeInTheDocument();
    expect(screen.getByText('7"')).toBeInTheDocument();
  });

  it("filters records by size", async () => {
    render(<RecordShelf />);
    await waitFor(() => screen.getAllByTestId("record-card"));

    fireEvent.click(screen.getByRole("button", { name: /filter records/i }));

    // Check the 7" size filter
    const checkbox = screen.getByLabelText('7"');
    fireEvent.click(checkbox);

    // Only 1 record has 7"
    expect(screen.getAllByTestId("record-card")).toHaveLength(1);
  });

  it("shows 'X of Y shown' when filters are active", async () => {
    render(<RecordShelf />);
    await waitFor(() => screen.getAllByTestId("record-card"));

    fireEvent.click(screen.getByRole("button", { name: /filter records/i }));
    fireEvent.click(screen.getByLabelText('7"'));

    expect(screen.getByText(/of 3 shown/)).toBeInTheDocument();
  });

  it("clears filters when 'Clear filters' button is clicked", async () => {
    render(<RecordShelf />);
    await waitFor(() => screen.getAllByTestId("record-card"));

    fireEvent.click(screen.getByRole("button", { name: /filter records/i }));
    fireEvent.click(screen.getByLabelText('7"'));
    expect(screen.getAllByTestId("record-card")).toHaveLength(1);

    fireEvent.click(screen.getByText("Clear filters"));
    expect(screen.getAllByTestId("record-card")).toHaveLength(3);
  });

  it("filters to shaped vinyl only", async () => {
    const shapedRecord = makeRecord({ isShapedVinyl: true, albumTitle: "Shaped One", recordSize: '12"' });
    mockFetchOk([...records, shapedRecord]);
    render(<RecordShelf />);
    await waitFor(() => screen.getAllByTestId("record-card"));

    fireEvent.click(screen.getByRole("button", { name: /filter records/i }));
    fireEvent.click(screen.getByLabelText(/picture disc/i));

    expect(screen.getAllByTestId("record-card")).toHaveLength(1);
    expect(screen.getByText("Shaped One")).toBeInTheDocument();
  });
});
