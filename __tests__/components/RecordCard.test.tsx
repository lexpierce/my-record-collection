/**
 * Tests for components/records/RecordCard.tsx
 *
 * DOM interaction is handled by @testing-library/react.
 * fetch is mocked globally so no real HTTP calls are made.
 * The component no longer uses window.alert / window.confirm — errors and
 * confirmations are shown as inline DOM elements instead.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecordCard from "@/components/records/RecordCard";
import type { Record } from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Next/image renders a plain <img> in test environment.
// Destructure out Next.js-specific props that are invalid HTML attributes.
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
    className,
    style,
  }: {
    src: string;
    alt?: string;
    width?: number;
    height?: number;
    className?: string;
    style?: React.CSSProperties;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ""} width={width} height={height} className={className} style={style} />
  ),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const baseRecord: Record = {
  recordId: "uuid-1",
  artistName: "Nirvana",
  albumTitle: "Nevermind",
  yearReleased: 1991,
  labelName: "DGC",
  catalogNumber: "DGC-24425",
  discogsId: "123",
  discogsUri: "https://discogs.com/release/123",
  thumbnailUrl: "http://example.com/thumb.jpg",
  coverImageUrl: "http://example.com/cover.jpg",
  genres: ["Rock"],
  styles: ["Grunge"],
  upcCode: null,
  recordSize: '12"',
  vinylColor: "Black",
  isShapedVinyl: false,
  dataSource: "discogs",
  isSyncedWithDiscogs: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const fetchSpy = vi.spyOn(globalThis, "fetch");

beforeEach(() => {
  vi.clearAllMocks();
  fetchSpy.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ record: baseRecord }),
  } as Response);
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("RecordCard — rendering", () => {
  const noop = vi.fn();

  it("renders album title and artist on the front", () => {
    render(<RecordCard record={baseRecord} onRecordMutated={noop} />);
    // Title and artist appear on both front and back — just assert presence
    expect(screen.getAllByText("Nevermind").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nirvana").length).toBeGreaterThan(0);
  });

  it("renders album art when thumbnailUrl is provided", () => {
    render(<RecordCard record={baseRecord} onRecordMutated={noop} />);
    const img = screen.getAllByAltText(/Nevermind by Nirvana/)[0];
    expect(img).toBeInTheDocument();
  });

  it("renders 'No Image' placeholder when thumbnailUrl is null", () => {
    render(<RecordCard record={{ ...baseRecord, thumbnailUrl: null }} onRecordMutated={noop} />);
    // Both front and back may show this
    expect(screen.getAllByText("No Image").length).toBeGreaterThan(0);
  });

  it("renders metadata on the back (year, label, size, color)", () => {
    render(<RecordCard record={baseRecord} onRecordMutated={noop} />);
    // These are in the back-face markup — always in DOM, just hidden by CSS
    expect(screen.getByText("1991")).toBeInTheDocument();
    expect(screen.getByText("DGC")).toBeInTheDocument();
    expect(screen.getByText('12"')).toBeInTheDocument();
    expect(screen.getByText("Black")).toBeInTheDocument();
  });

  it("shows synced checkmark when isSyncedWithDiscogs is true", () => {
    render(<RecordCard record={baseRecord} onRecordMutated={noop} />);
    // ✓ rendered as &#10003;
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("shows Shaped/Picture Disc when isShapedVinyl is true", () => {
    render(<RecordCard record={{ ...baseRecord, isShapedVinyl: true }} onRecordMutated={noop} />);
    expect(screen.getByText("Shaped/Picture Disc")).toBeInTheDocument();
  });

  it("renders discogsUri as a 'View on Discogs' link", () => {
    render(<RecordCard record={baseRecord} onRecordMutated={noop} />);
    const link = screen.getByRole("link", { name: /view on discogs/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", baseRecord.discogsUri);
    expect(link).toHaveAttribute("target", "_blank");
  });
});

// ---------------------------------------------------------------------------
// Flip behaviour
// ---------------------------------------------------------------------------

describe("RecordCard — flip", () => {
  const noop = vi.fn();

  it("adds 'flipped' class when card is clicked", () => {
    const { container } = render(<RecordCard record={baseRecord} onRecordMutated={noop} />);
    const card = container.querySelector(".flip-card");
    expect(card).not.toBeNull();
    fireEvent.click(card!);
    expect(card!.classList.contains("flipped")).toBe(true);
  });

  it("removes 'flipped' class on second click", () => {
    const { container } = render(<RecordCard record={baseRecord} onRecordMutated={noop} />);
    const card = container.querySelector(".flip-card")!;
    fireEvent.click(card);
    fireEvent.click(card);
    expect(card.classList.contains("flipped")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Update action
// ---------------------------------------------------------------------------

describe("RecordCard — update from Discogs", () => {
  it("calls update API and onRecordMutated on success", async () => {
    const onRecordMutated = vi.fn();
    render(<RecordCard record={baseRecord} onRecordMutated={onRecordMutated} />);
    const btn = screen.getByRole("button", { name: /update/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/records/update-from-discogs",
        expect.objectContaining({ method: "POST" })
      );
    });
    await waitFor(() => expect(onRecordMutated).toHaveBeenCalledTimes(1));
  });

  it("shows inline error when record has no discogsId", async () => {
    render(<RecordCard record={{ ...baseRecord, discogsId: null }} onRecordMutated={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /update/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText(/no Discogs ID/i)).toBeInTheDocument();
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows inline error when update API call fails", async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: "fail" }) } as Response);
    render(<RecordCard record={baseRecord} onRecordMutated={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /update/i }));
    await waitFor(() => {
      expect(screen.getByText(/failed to update record from discogs/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Delete action
// ---------------------------------------------------------------------------

describe("RecordCard — delete", () => {
  it("calls delete API and onRecordMutated when confirmed via inline UI", async () => {
    const onRecordMutated = vi.fn();
    render(<RecordCard record={baseRecord} onRecordMutated={onRecordMutated} />);

    // First click shows the "Are you sure?" prompt
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    // "Yes" button appears — click it
    const yesBtn = await screen.findByRole("button", { name: /yes/i });
    fireEvent.click(yesBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        `/api/records/${baseRecord.recordId}`,
        expect.objectContaining({ method: "DELETE" })
      );
    });
    await waitFor(() => expect(onRecordMutated).toHaveBeenCalledTimes(1));
  });

  it("does NOT call delete API when confirm is cancelled via inline UI", async () => {
    render(<RecordCard record={baseRecord} onRecordMutated={vi.fn()} />);

    // First click shows the "Are you sure?" prompt
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    // "No" button appears — click it
    const noBtn = await screen.findByRole("button", { name: /no/i });
    fireEvent.click(noBtn);

    // Allow microtasks to settle
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows inline error when delete API call fails", async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) } as Response);
    render(<RecordCard record={baseRecord} onRecordMutated={vi.fn()} />);

    // Open confirm prompt then click Yes
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    const yesBtn = await screen.findByRole("button", { name: /yes/i });
    fireEvent.click(yesBtn);

    await waitFor(() => {
      expect(screen.getByText(/failed to delete record/i)).toBeInTheDocument();
    });
  });
});
