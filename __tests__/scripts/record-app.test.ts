/**
 * Tests for src/scripts/record-app.ts
 *
 * This module has no exports — it wires up the shelf UI and runs top-level
 * side effects on import (wireStaticEvents, checkSyncStatus, loadRecords).
 * Strategy:
 *  - Build the same data-* markup as src/pages/index.astro before each test.
 *  - Mock globalThis.fetch with a small path-based router (project convention:
 *    URL-routing mockImplementation, not mockReturnValueOnce stacks).
 *  - vi.resetModules() + dynamic import per test so the module's top-level
 *    init runs fresh against the new DOM and fetch mock.
 *  - vi.waitFor() to await the fire-and-forget async init before asserting.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { BrowserRecord } from "@/src/scripts/record-helpers";

// ---------------------------------------------------------------------------
// DOM fixture (mirrors src/pages/index.astro)
// ---------------------------------------------------------------------------

function mountMarkup(): void {
  document.body.innerHTML = `
    <main class="main" data-record-app>
      <header class="header">
        <div class="headerActions">
          <button type="button" class="btnPrimary" data-sync-button>Sync Collection</button>
        </div>
      </header>

      <div class="syncWarning" data-sync-warning hidden>
        <div class="syncWarningInner" data-sync-warning-content></div>
      </div>

      <div class="syncBar" data-sync-bar hidden>
        <div class="syncBarInner">
          <div class="syncStatus" data-sync-status></div>
          <div class="syncProgressTrack" data-sync-progress-track hidden>
            <div class="syncProgressFill" data-sync-progress-fill></div>
          </div>
        </div>
      </div>

      <div class="syncErrors" data-sync-errors hidden>
        <div class="syncErrorsInner" data-sync-errors-content></div>
      </div>

      <section class="shelfSection">
        <div data-shelf-root></div>
      </section>
    </main>
  `;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeRecord(overrides: Partial<BrowserRecord> = {}): BrowserRecord {
  return {
    recordId: "1",
    artistName: "The Beatles",
    albumTitle: "Abbey Road",
    yearReleased: 1969,
    labelName: null,
    catalogNumber: null,
    discogsId: "d1",
    discogsUri: null,
    isSyncedWithDiscogs: false,
    thumbnailUrl: null,
    coverImageUrl: null,
    genres: [],
    styles: [],
    upcCode: null,
    recordSize: null,
    vinylColor: null,
    isShapedVinyl: false,
    dataSource: "discogs",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Fetch mocking helpers
// ---------------------------------------------------------------------------

type RouteHandler = (url: URL, init?: RequestInit) => Response | Promise<Response>;
type Routes = Record<string, RouteHandler>;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "Content-Type": "application/json" }),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

function textErrorResponse(message: string, status = 500): Response {
  return {
    ok: false,
    status,
    headers: new Headers({ "Content-Type": "text/plain" }),
    json: () => Promise.reject(new Error("not json")),
    text: () => Promise.resolve(message),
  } as Response;
}

/** Builds a fetch Response whose body streams the given SSE events, then closes. */
function sseResponse(events: Record<string, unknown>[]): Response {
  const encoder = new TextEncoder();
  const chunks = events.map((event) => `data: ${JSON.stringify(event)}\n\n`);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "Content-Type": "text/event-stream" }),
    body: stream,
  } as unknown as Response;
}

const DEFAULT_ROUTES: Routes = {
  "GET /api/records/sync/status": () => jsonResponse({ ready: true, missing: [] }),
  "GET /api/records": () => jsonResponse({ records: [] }),
};

function mockFetchRoutes(overrides: Routes = {}): void {
  const routes = { ...DEFAULT_ROUTES, ...overrides };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const rawUrl = typeof input === "string" ? input : input.toString();
      const url = new URL(rawUrl, "http://localhost");
      const method = (init?.method || "GET").toUpperCase();
      const key = `${method} ${url.pathname}`;
      const handler = routes[key];
      if (!handler) throw new Error(`Unhandled fetch: ${key}`);
      return handler(url, init);
    }),
  );
}

/** Fresh top-level init: resets modules and imports record-app.ts for side effects. */
async function bootApp(): Promise<void> {
  vi.resetModules();
  await import("@/src/scripts/record-app");
}

function shelfRoot(): HTMLElement {
  return document.querySelector("[data-shelf-root]") as HTMLElement;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mountMarkup();
  sessionStorage.clear();
  // Default to "user dismissed the prompt" so tests that don't care about
  // auth (and don't pre-seed a token) stay quiet instead of jsdom logging
  // "Not implemented: Window's prompt() method".
  vi.spyOn(window, "prompt").mockReturnValue(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// checkSyncStatus
// ---------------------------------------------------------------------------

describe("checkSyncStatus", () => {
  it("shows the sync warning listing missing env vars when not ready", async () => {
    mockFetchRoutes({
      "GET /api/records/sync/status": () =>
        jsonResponse({ ready: false, missing: ["DISCOGS_USERNAME", "DISCOGS_TOKEN"] }),
    });
    await bootApp();

    await vi.waitFor(() => {
      expect(document.querySelector("[data-sync-warning]")).not.toHaveAttribute("hidden");
    });
    expect(document.querySelector("[data-sync-warning-content]")?.innerHTML).toContain(
      "DISCOGS_USERNAME and DISCOGS_TOKEN",
    );
  });

  it("keeps the sync warning hidden when ready", async () => {
    mockFetchRoutes({
      "GET /api/records/sync/status": () => jsonResponse({ ready: true, missing: [] }),
    });
    await bootApp();

    await vi.waitFor(() => {
      expect(shelfRoot().innerHTML).not.toContain("Loading");
    });
    expect(document.querySelector("[data-sync-warning]")).toHaveAttribute("hidden");
  });

  it("hides the warning when the status check itself fails", async () => {
    mockFetchRoutes({
      "GET /api/records/sync/status": () => {
        throw new Error("network down");
      },
    });
    await bootApp();

    await vi.waitFor(() => {
      expect(shelfRoot().innerHTML).not.toContain("Loading");
    });
    expect(document.querySelector("[data-sync-warning]")).toHaveAttribute("hidden");
  });
});

// ---------------------------------------------------------------------------
// loadRecords / renderShelf
// ---------------------------------------------------------------------------

describe("loadRecords — empty and error states", () => {
  it("renders the empty-collection message when there are no records", async () => {
    mockFetchRoutes({ "GET /api/records": () => jsonResponse({ records: [] }) });
    await bootApp();

    await vi.waitFor(() => {
      expect(shelfRoot().innerHTML).toContain("Your collection is empty");
    });
  });

  it("renders an error message when the records fetch fails", async () => {
    mockFetchRoutes({
      "GET /api/records": () => textErrorResponse("boom", 500),
    });
    await bootApp();

    await vi.waitFor(() => {
      expect(shelfRoot().innerHTML).toContain("boom");
    });
  });
});

describe("loadRecords — populated shelf", () => {
  it("renders the record count and one card per record", async () => {
    const records = [
      makeRecord({ recordId: "1", artistName: "The Beatles", albumTitle: "Abbey Road" }),
      makeRecord({ recordId: "2", artistName: "Nirvana", albumTitle: "Nevermind" }),
    ];
    mockFetchRoutes({ "GET /api/records": () => jsonResponse({ records }) });
    await bootApp();

    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(2);
    });
    expect(shelfRoot().innerHTML).toContain("2 records");
    expect(shelfRoot().innerHTML).toContain("Abbey Road");
    expect(shelfRoot().innerHTML).toContain("Nevermind");
  });

  it("renders singular record count for exactly one record", async () => {
    mockFetchRoutes({ "GET /api/records": () => jsonResponse({ records: [makeRecord()] }) });
    await bootApp();

    await vi.waitFor(() => {
      expect(shelfRoot().innerHTML).toContain("1 record");
    });
    expect(shelfRoot().innerHTML).not.toContain("1 records");
  });
});

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

describe("sorting", () => {
  const records = [
    makeRecord({ recordId: "z", artistName: "Zebra", albumTitle: "Z Album" }),
    makeRecord({ recordId: "a", artistName: "Aardvark", albumTitle: "A Album" }),
  ];

  it("sorts by artist ascending by default", async () => {
    mockFetchRoutes({ "GET /api/records": () => jsonResponse({ records }) });
    await bootApp();

    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(2);
    });
    const cards = [...shelfRoot().querySelectorAll("[data-record-card]")];
    expect(cards.map((card) => card.getAttribute("data-record-id"))).toEqual(["a", "z"]);
  });

  it("re-sorts when the sort field changes", async () => {
    mockFetchRoutes({ "GET /api/records": () => jsonResponse({ records }) });
    await bootApp();
    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(2);
    });

    const select = shelfRoot().querySelector<HTMLSelectElement>("[data-sort-by]")!;
    select.value = "title";
    select.dispatchEvent(new Event("change"));

    const cards = [...shelfRoot().querySelectorAll("[data-record-card]")];
    expect(cards.map((card) => card.getAttribute("data-record-id"))).toEqual(["a", "z"]);
  });

  it("reverses order when the direction toggle is clicked", async () => {
    mockFetchRoutes({ "GET /api/records": () => jsonResponse({ records }) });
    await bootApp();
    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(2);
    });

    shelfRoot().querySelector<HTMLButtonElement>("[data-sort-direction]")!.click();

    const cards = [...shelfRoot().querySelectorAll("[data-record-card]")];
    expect(cards.map((card) => card.getAttribute("data-record-id"))).toEqual(["z", "a"]);
  });
});

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

describe("filtering", () => {
  const records = [
    makeRecord({ recordId: "1", recordSize: '7"', isShapedVinyl: false }),
    makeRecord({ recordId: "2", recordSize: '12"', isShapedVinyl: true }),
  ];

  it("toggles the filter dropdown open and closed", async () => {
    mockFetchRoutes({ "GET /api/records": () => jsonResponse({ records }) });
    await bootApp();
    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(2);
    });

    expect(shelfRoot().querySelector(".filterDropdown")).toBeNull();
    shelfRoot().querySelector<HTMLButtonElement>("[data-filter-toggle]")!.click();
    expect(shelfRoot().querySelector(".filterDropdown")).not.toBeNull();
  });

  it("filters by size and shows the filtered/total count", async () => {
    mockFetchRoutes({ "GET /api/records": () => jsonResponse({ records }) });
    await bootApp();
    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(2);
    });

    shelfRoot().querySelector<HTMLButtonElement>("[data-filter-toggle]")!.click();
    const checkbox = shelfRoot().querySelector<HTMLInputElement>('[data-size-filter="12\\""]')!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));

    expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(1);
    expect(shelfRoot().innerHTML).toContain("1 of 2 shown");
  });

  it("filters to shaped-only records", async () => {
    mockFetchRoutes({ "GET /api/records": () => jsonResponse({ records }) });
    await bootApp();
    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(2);
    });

    shelfRoot().querySelector<HTMLButtonElement>("[data-filter-toggle]")!.click();
    const checkbox = shelfRoot().querySelector<HTMLInputElement>("[data-shaped-filter]")!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));

    const cards = [...shelfRoot().querySelectorAll("[data-record-card]")];
    expect(cards.map((c) => c.getAttribute("data-record-id"))).toEqual(["2"]);
  });

  it("clears all active filters via the clear-filters button", async () => {
    mockFetchRoutes({ "GET /api/records": () => jsonResponse({ records }) });
    await bootApp();
    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(2);
    });

    shelfRoot().querySelector<HTMLButtonElement>("[data-filter-toggle]")!.click();
    shelfRoot().querySelector<HTMLInputElement>("[data-shaped-filter]")!.checked = true;
    shelfRoot()
      .querySelector<HTMLInputElement>("[data-shaped-filter]")!
      .dispatchEvent(new Event("change"));
    expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(1);

    shelfRoot().querySelector<HTMLButtonElement>("[data-clear-filters]")!.click();

    expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Alphabetical nav + pagination
// ---------------------------------------------------------------------------

describe("alpha nav and pagination", () => {
  it("filters to a bucket when an alpha-nav button is clicked, and 'All' resets it", async () => {
    // Two 30-record same-letter groups: combined (60) exceeds the default
    // page size (50, maxSize for computeBuckets), so pass 2 keeps them as
    // separate "A" / "Z" buckets instead of merging into one range.
    const records = [
      ...Array.from({ length: 30 }, (_, i) => makeRecord({ recordId: `a${i}`, artistName: `Aardvark${i}` })),
      ...Array.from({ length: 30 }, (_, i) => makeRecord({ recordId: `z${i}`, artistName: `Zebra${i}` })),
    ];
    mockFetchRoutes({ "GET /api/records": () => jsonResponse({ records }) });
    await bootApp();
    // Page 1 of the unfiltered (60-record) list is truncated to the 50-record page size.
    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(50);
    });

    const bucketButtons = [...shelfRoot().querySelectorAll<HTMLButtonElement>("[data-alpha-bucket]")];
    const aBucket = bucketButtons.find((btn) => btn.dataset.alphaBucket === "A");
    expect(aBucket).toBeDefined();
    aBucket!.click();

    const cards = [...shelfRoot().querySelectorAll("[data-record-card]")];
    expect(cards).toHaveLength(30);
    expect(cards.every((card) => card.getAttribute("data-record-id")!.startsWith("a"))).toBe(true);

    shelfRoot().querySelector<HTMLButtonElement>('[data-alpha-bucket=""]')!.click();
    expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(50);
  });

  it("paginates with next/prev controls", async () => {
    const records = Array.from({ length: 26 }, (_, i) =>
      makeRecord({ recordId: `r${i}`, artistName: `Artist${String(i).padStart(2, "0")}` }),
    );
    mockFetchRoutes({ "GET /api/records": () => jsonResponse({ records }) });
    await bootApp();
    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(26);
    });

    const pageSizeSelect = shelfRoot().querySelector<HTMLSelectElement>("[data-page-size]")!;
    pageSizeSelect.value = "25";
    pageSizeSelect.dispatchEvent(new Event("change"));

    expect(shelfRoot().innerHTML).toContain("1 / 2");
    expect(shelfRoot().querySelector("[data-page-prev]")).toHaveAttribute("disabled");

    shelfRoot().querySelector<HTMLButtonElement>("[data-page-next]")!.click();
    expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(1);
    expect(shelfRoot().innerHTML).toContain("2 / 2");
    expect(shelfRoot().querySelector("[data-page-next]")).toHaveAttribute("disabled");

    shelfRoot().querySelector<HTMLButtonElement>("[data-page-prev]")!.click();
    expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(25);
    expect(shelfRoot().innerHTML).toContain("1 / 2");
  });
});

// ---------------------------------------------------------------------------
// Card flip interactions
// ---------------------------------------------------------------------------

describe("card flip", () => {
  it("flips a card on click and back on a second click", async () => {
    mockFetchRoutes({ "GET /api/records": () => jsonResponse({ records: [makeRecord()] }) });
    await bootApp();
    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(1);
    });

    const card = shelfRoot().querySelector<HTMLElement>("[data-record-card]")!;
    card.click();
    expect(card.classList.contains("flipped")).toBe(true);
    expect(card).toHaveAttribute("aria-expanded", "true");

    card.click();
    expect(card.classList.contains("flipped")).toBe(false);
  });

  it("flips a card via Enter and Space keys", async () => {
    mockFetchRoutes({ "GET /api/records": () => jsonResponse({ records: [makeRecord()] }) });
    await bootApp();
    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(1);
    });

    const card = shelfRoot().querySelector<HTMLElement>("[data-record-card]")!;
    card.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", cancelable: true }));
    expect(card.classList.contains("flipped")).toBe(true);

    card.dispatchEvent(new KeyboardEvent("keydown", { key: " ", cancelable: true }));
    expect(card.classList.contains("flipped")).toBe(false);
  });

  it("does not flip when clicking the update or delete buttons", async () => {
    sessionStorage.setItem("app_auth_token", "token");
    mockFetchRoutes({
      "GET /api/records": () => jsonResponse({ records: [makeRecord({ discogsId: "d1" })] }),
      "POST /api/records/update-from-discogs": () => jsonResponse({}),
    });
    await bootApp();
    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(1);
    });

    const card = shelfRoot().querySelector<HTMLElement>("[data-record-card]")!;
    card.querySelector<HTMLButtonElement>("[data-update-record]")!.click();
    expect(card.classList.contains("flipped")).toBe(false);
  });

  it("flips all open cards back when clicking outside a card", async () => {
    mockFetchRoutes({ "GET /api/records": () => jsonResponse({ records: [makeRecord()] }) });
    await bootApp();
    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(1);
    });

    const card = shelfRoot().querySelector<HTMLElement>("[data-record-card]")!;
    card.click();
    expect(card.classList.contains("flipped")).toBe(true);

    document.querySelector("header")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(card.classList.contains("flipped")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Update / delete record actions
// ---------------------------------------------------------------------------

describe("update record", () => {
  it("reloads the shelf after a successful update", async () => {
    sessionStorage.setItem("app_auth_token", "token");
    let recordsCallCount = 0;
    mockFetchRoutes({
      "GET /api/records": () => {
        recordsCallCount++;
        return jsonResponse({ records: [makeRecord({ discogsId: "d1" })] });
      },
      "POST /api/records/update-from-discogs": () => jsonResponse({}),
    });
    await bootApp();
    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(1);
    });

    shelfRoot().querySelector<HTMLButtonElement>("[data-update-record]")!.click();

    await vi.waitFor(() => {
      expect(recordsCallCount).toBe(2);
    });
  });

  it("shows a card error when the record has no Discogs ID", async () => {
    sessionStorage.setItem("app_auth_token", "token");
    mockFetchRoutes({
      "GET /api/records": () => jsonResponse({ records: [makeRecord({ discogsId: null })] }),
    });
    await bootApp();
    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(1);
    });

    shelfRoot().querySelector<HTMLButtonElement>("[data-update-record]")!.click();
    const errorEl = shelfRoot().querySelector<HTMLElement>("[data-action-error]")!;
    expect(errorEl.hidden).toBe(false);
    expect(errorEl.textContent).toContain("no Discogs ID");
  });

  it("shows a card error when the update request fails", async () => {
    sessionStorage.setItem("app_auth_token", "token");
    mockFetchRoutes({
      "GET /api/records": () => jsonResponse({ records: [makeRecord({ discogsId: "d1" })] }),
      "POST /api/records/update-from-discogs": () => textErrorResponse("nope", 500),
    });
    await bootApp();
    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(1);
    });

    shelfRoot().querySelector<HTMLButtonElement>("[data-update-record]")!.click();

    await vi.waitFor(() => {
      const errorEl = shelfRoot().querySelector<HTMLElement>("[data-action-error]")!;
      expect(errorEl.hidden).toBe(false);
    });
  });
});

describe("delete record", () => {
  it("shows and cancels the delete confirmation", async () => {
    sessionStorage.setItem("app_auth_token", "token");
    mockFetchRoutes({ "GET /api/records": () => jsonResponse({ records: [makeRecord()] }) });
    await bootApp();
    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(1);
    });

    const confirmBox = shelfRoot().querySelector<HTMLElement>("[data-confirm-delete]")!;
    expect(confirmBox.hidden).toBe(true);

    shelfRoot().querySelector<HTMLButtonElement>("[data-delete-request]")!.click();
    expect(confirmBox.hidden).toBe(false);

    shelfRoot().querySelector<HTMLButtonElement>("[data-delete-cancel]")!.click();
    expect(confirmBox.hidden).toBe(true);
  });

  it("deletes the record and reloads the shelf on confirm", async () => {
    sessionStorage.setItem("app_auth_token", "token");
    let recordsCallCount = 0;
    let deleteUrl = "";
    mockFetchRoutes({
      "GET /api/records": () => {
        recordsCallCount++;
        return jsonResponse({ records: recordsCallCount === 1 ? [makeRecord({ recordId: "r1" })] : [] });
      },
      "DELETE /api/records/r1": (url) => {
        deleteUrl = url.pathname;
        return jsonResponse({});
      },
    });
    await bootApp();
    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(1);
    });

    shelfRoot().querySelector<HTMLButtonElement>("[data-delete-request]")!.click();
    shelfRoot().querySelector<HTMLButtonElement>("[data-delete-confirm]")!.click();

    await vi.waitFor(() => {
      expect(deleteUrl).toBe("/api/records/r1");
      expect(recordsCallCount).toBe(2);
    });
  });

  it("shows a card error when the delete request fails", async () => {
    sessionStorage.setItem("app_auth_token", "token");
    mockFetchRoutes({
      "GET /api/records": () => jsonResponse({ records: [makeRecord({ recordId: "r1" })] }),
      "DELETE /api/records/r1": () => textErrorResponse("nope", 500),
    });
    await bootApp();
    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(1);
    });

    shelfRoot().querySelector<HTMLButtonElement>("[data-delete-request]")!.click();
    shelfRoot().querySelector<HTMLButtonElement>("[data-delete-confirm]")!.click();

    await vi.waitFor(() => {
      const errorEl = shelfRoot().querySelector<HTMLElement>("[data-action-error]")!;
      expect(errorEl.hidden).toBe(false);
      expect(errorEl.textContent).toContain("Failed to delete");
    });
  });
});

// ---------------------------------------------------------------------------
// Auth token handling
// ---------------------------------------------------------------------------

describe("auth token", () => {
  it("prompts once and caches the token in sessionStorage", async () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("prompted-token");
    mockFetchRoutes({
      "GET /api/records": () => jsonResponse({ records: [makeRecord({ discogsId: "d1" })] }),
      "POST /api/records/update-from-discogs": (_url, init) => {
        expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer prompted-token");
        return jsonResponse({});
      },
    });
    await bootApp();
    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(1);
    });

    shelfRoot().querySelector<HTMLButtonElement>("[data-update-record]")!.click();

    await vi.waitFor(() => {
      expect(promptSpy).toHaveBeenCalledTimes(1);
    });
    expect(sessionStorage.getItem("app_auth_token")).toBe("prompted-token");
  });

  it("clears the cached token on a 401 response", async () => {
    sessionStorage.setItem("app_auth_token", "stale-token");
    mockFetchRoutes({
      "GET /api/records": () => jsonResponse({ records: [makeRecord({ discogsId: "d1" })] }),
      "POST /api/records/update-from-discogs": () => jsonResponse({ message: "expired" }, 401),
    });
    await bootApp();
    await vi.waitFor(() => {
      expect(shelfRoot().querySelectorAll("[data-record-card]")).toHaveLength(1);
    });

    shelfRoot().querySelector<HTMLButtonElement>("[data-update-record]")!.click();

    await vi.waitFor(() => {
      expect(sessionStorage.getItem("app_auth_token")).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Sync flow
// ---------------------------------------------------------------------------

describe("handleSync", () => {
  it("streams progress updates and reloads records when done", async () => {
    let recordsCallCount = 0;
    mockFetchRoutes({
      "GET /api/records": () => {
        recordsCallCount++;
        return jsonResponse({ records: [] });
      },
      "POST /api/records/sync": () =>
        sseResponse([
          { phase: "pull", pulled: 1, updated: 0, skipped: 0, errors: [], totalDiscogsItems: 2 },
          { phase: "done", pulled: 2, updated: 0, skipped: 0, errors: [], totalDiscogsItems: 2 },
        ]),
    });
    await bootApp();
    await vi.waitFor(() => {
      expect(recordsCallCount).toBe(1);
    });

    const button = document.querySelector<HTMLButtonElement>("[data-sync-button]")!;
    button.click();
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe("Syncing...");

    await vi.waitFor(() => {
      expect(recordsCallCount).toBe(2);
    });
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe("Sync Collection");
    expect(document.querySelector("[data-sync-bar]")).toHaveAttribute("hidden");
  });

  it("shows sync errors reported mid-stream", async () => {
    mockFetchRoutes({
      "POST /api/records/sync": () =>
        sseResponse([
          {
            phase: "done",
            pulled: 0,
            updated: 0,
            skipped: 0,
            errors: ["Pull 123: connection timeout"],
            totalDiscogsItems: 0,
          },
        ]),
    });
    await bootApp();
    await vi.waitFor(() => {
      expect(shelfRoot().innerHTML).not.toContain("Loading");
    });

    document.querySelector<HTMLButtonElement>("[data-sync-button]")!.click();

    await vi.waitFor(() => {
      expect(document.querySelector("[data-sync-errors]")).not.toHaveAttribute("hidden");
    });
    expect(document.querySelector("[data-sync-errors-content]")?.textContent).toContain(
      "connection timeout",
    );
  });

  it("renders a failure message and re-enables the button when the sync request errors", async () => {
    mockFetchRoutes({
      "POST /api/records/sync": () => textErrorResponse("sync failed", 500),
    });
    await bootApp();
    await vi.waitFor(() => {
      expect(shelfRoot().innerHTML).not.toContain("Loading");
    });

    const button = document.querySelector<HTMLButtonElement>("[data-sync-button]")!;
    button.click();

    await vi.waitFor(() => {
      expect(button.disabled).toBe(false);
    });
    expect(button.textContent).toBe("Sync Collection");
    expect(document.querySelector("[data-sync-errors]")).not.toHaveAttribute("hidden");
    expect(document.querySelector("[data-sync-errors-content]")?.textContent).toContain("sync failed");
  });
});
