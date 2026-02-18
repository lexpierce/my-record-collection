/**
 * Tests for app/page.tsx (HomePage)
 *
 * Mocks fetch to avoid real API calls.
 * RecordShelf and SearchBar are stubbed to isolate page-level logic.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import HomePage from "@/app/page";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Stub heavy child components to isolate page logic
vi.mock("@/components/records/RecordShelf", () => ({
  default: ({ refreshKey }: { refreshKey: number }) => (
    <div data-testid="record-shelf" data-refresh={refreshKey} />
  ),
}));

vi.mock("@/components/records/SearchBar", () => ({
  default: ({ onRecordAdded }: { onRecordAdded: () => void }) => (
    <div data-testid="search-bar">
      <button onClick={onRecordAdded}>Mock Add</button>
    </div>
  ),
}));

vi.mock("@/app/page.module.scss", () => ({
  default: new Proxy({}, { get: (_t, key) => String(key) }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a ReadableStream that emits SSE-formatted JSON and then closes. */
function makeSSEStream(events: object[]) {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < events.length) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(events[i++])}\n\n`));
      } else {
        controller.close();
      }
    },
  });
}

const fetchSpy = vi.spyOn(globalThis, "fetch");

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("HomePage — rendering", () => {
  it("renders the page title", () => {
    render(<HomePage />);
    expect(screen.getByText("My Record Collection")).toBeInTheDocument();
  });

  it("renders the record shelf", () => {
    render(<HomePage />);
    expect(screen.getByTestId("record-shelf")).toBeInTheDocument();
  });

  it("does NOT show search bar initially", () => {
    render(<HomePage />);
    expect(screen.queryByTestId("search-bar")).not.toBeInTheDocument();
  });

  it("shows Sync Collection button", () => {
    render(<HomePage />);
    expect(screen.getByRole("button", { name: /sync collection/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Search toggle
// ---------------------------------------------------------------------------

describe("HomePage — search toggle", () => {
  it("shows search bar when '+ Add an album' is clicked", () => {
    render(<HomePage />);
    fireEvent.click(screen.getByRole("button", { name: /\+ Add an album/i }));
    expect(screen.getByTestId("search-bar")).toBeInTheDocument();
  });

  it("hides search bar when 'Close' is clicked", () => {
    render(<HomePage />);
    fireEvent.click(screen.getByRole("button", { name: /\+ Add an album/i }));
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByTestId("search-bar")).not.toBeInTheDocument();
  });

  it("bumps refreshKey when onRecordAdded is called", () => {
    render(<HomePage />);
    fireEvent.click(screen.getByRole("button", { name: /\+ Add an album/i }));
    const shelf = screen.getByTestId("record-shelf");
    const before = Number(shelf.dataset.refresh);
    fireEvent.click(screen.getByRole("button", { name: /mock add/i }));
    expect(Number(shelf.dataset.refresh)).toBe(before + 1);
  });
});

// ---------------------------------------------------------------------------
// Sync flow
// ---------------------------------------------------------------------------

describe("HomePage — sync", () => {
  it("shows 'Syncing...' on the button while sync is in progress", async () => {
    // Stream never closes during the test — button stays in syncing state
    fetchSpy.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        body: makeSSEStream([
          { phase: "pull", pulled: 0, pushed: 0, skipped: 0, errors: [], totalDiscogsItems: 10 },
        ]),
      } as Response)
    );

    render(<HomePage />);
    fireEvent.click(screen.getByRole("button", { name: /sync collection/i }));
    expect(await screen.findByRole("button", { name: /syncing/i })).toBeInTheDocument();
  });

  it("shows Pulling from Discogs text after a pull progress event is received", async () => {
    // Use a stream that sends a pull event and then stalls — never sends "done"
    const encoder = new TextEncoder();
    let _ctrl: ReadableStreamDefaultController;
    const body = new ReadableStream({
      start(c) { _ctrl = c; },
    });

    fetchSpy.mockReturnValueOnce(
      Promise.resolve({ ok: true, body } as Response)
    );

    render(<HomePage />);
    fireEvent.click(screen.getByRole("button", { name: /sync collection/i }));

    // Push a pull-phase event
    _ctrl!.enqueue(
      encoder.encode(
        `data: ${JSON.stringify({ phase: "pull", pulled: 5, pushed: 0, skipped: 0, errors: [], totalDiscogsItems: 10 })}\n\n`
      )
    );

    await waitFor(() => {
      expect(screen.getByText(/Pulling from Discogs/i)).toBeInTheDocument();
    });

    // Clean up the stream
    _ctrl!.close();
  });

  it("shows sync errors when errors are present", async () => {
    fetchSpy.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        body: makeSSEStream([
          {
            phase: "done",
            pulled: 0,
            pushed: 0,
            skipped: 0,
            errors: ["Failed to insert record 123"],
            totalDiscogsItems: 1,
          },
        ]),
      } as Response)
    );

    render(<HomePage />);
    fireEvent.click(screen.getByRole("button", { name: /sync collection/i }));

    await waitFor(() => {
      expect(screen.getByText("Failed to insert record 123")).toBeInTheDocument();
    });
  });

  it("bumps refreshKey after sync completes (shelf reloads without full-page reload)", async () => {
    fetchSpy.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        body: makeSSEStream([
          { phase: "done", pulled: 1, pushed: 0, skipped: 0, errors: [], totalDiscogsItems: 1 },
        ]),
      } as Response)
    );

    render(<HomePage />);
    const shelf = screen.getByTestId("record-shelf");
    const before = Number(shelf.dataset.refresh);

    fireEvent.click(screen.getByRole("button", { name: /sync collection/i }));

    await waitFor(() => {
      expect(Number(shelf.dataset.refresh)).toBeGreaterThan(before);
    });
  });

  it("handles fetch error gracefully and shows error in sync errors", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("Network failure"));

    render(<HomePage />);
    fireEvent.click(screen.getByRole("button", { name: /sync collection/i }));

    await waitFor(() => {
      expect(screen.getByText("Network failure")).toBeInTheDocument();
    });
  });

  it("handles missing response body gracefully", async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true, body: null } as Response);

    render(<HomePage />);
    fireEvent.click(screen.getByRole("button", { name: /sync collection/i }));

    await waitFor(() => {
      expect(screen.getByText(/No response stream/i)).toBeInTheDocument();
    });
  });
});
