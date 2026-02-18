/**
 * Tests for lib/discogs/client.ts
 *
 * Strategy: mock globalThis.fetch so no real HTTP calls are made.
 * Important: the RateLimiter adds a minimum delay between requests. Tests that
 * check the URL or options of the *first* call must account for the fact that
 * each new DiscogsClient instance resets the rate-limiter state, so creating a
 * fresh client per test avoids inter-test rate-limit waits.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DiscogsClient, createDiscogsClient } from "@/lib/discogs/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal fetch Response stub. */
function makeFetchResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    text: () => Promise.resolve(body === null ? "" : JSON.stringify(body)),
  } as Response);
}

/** Minimal Discogs format arrays */
const stdFormats = [
  { name: "Vinyl", qty: "1", descriptions: ['12"', "LP", "Album"] },
];
const colorFormats = [
  { name: "Vinyl", qty: "1", descriptions: ['12"', "Blue Vinyl"] },
];
const shapedFormats = [
  { name: "Vinyl", qty: "1", descriptions: ['7"', "Picture Disc"] },
];

beforeEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

describe("DiscogsClient constructor", () => {
  it("creates client without token (unauthenticated)", () => {
    expect(new DiscogsClient("TestApp/1.0")).toBeInstanceOf(DiscogsClient);
  });

  it("creates client with token (authenticated)", () => {
    expect(new DiscogsClient("TestApp/1.0", "secret-token")).toBeInstanceOf(DiscogsClient);
  });
});

// ---------------------------------------------------------------------------
// makeRequest — header / option tests
// Each test creates a fresh client and uses mockImplementation so the
// rate-limiter's first request resolves immediately.
// ---------------------------------------------------------------------------

describe("DiscogsClient.makeRequest", () => {
  it("sends correct User-Agent header", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => makeFetchResponse({ ok: true }));
    const client = new DiscogsClient("TestApp/1.0");
    await client.makeRequest("/test");
    const [, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)["User-Agent"]).toBe("TestApp/1.0");
  });

  it("includes Authorization header when token is provided", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => makeFetchResponse({ ok: true }));
    const client = new DiscogsClient("TestApp/1.0", "mytoken");
    await client.makeRequest("/test");
    const [, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)["Authorization"]).toBe(
      "Discogs token=mytoken"
    );
  });

  it("adds next.revalidate for GET requests", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => makeFetchResponse({ ok: true }));
    const client = new DiscogsClient("TestApp/1.0");
    await client.makeRequest("/test");
    const [, opts] = fetchSpy.mock.calls[0] as [string, RequestInit & { next?: unknown }];
    expect((opts as { next?: { revalidate: number } }).next?.revalidate).toBe(3600);
  });

  it("does NOT add next.revalidate for POST requests", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => makeFetchResponse(null, 201));
    const client = new DiscogsClient("TestApp/1.0");
    await client.makeRequest("/test", { method: "POST" });
    const [, opts] = fetchSpy.mock.calls[0] as [string, RequestInit & { next?: unknown }];
    expect((opts as { next?: unknown }).next).toBeUndefined();
  });

  it("throws typed error with .status on non-OK response", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      makeFetchResponse({ error: "not found" }, 404)
    );
    const client = new DiscogsClient("TestApp/1.0");
    await expect(client.makeRequest("/missing")).rejects.toMatchObject({ status: 404 });
  });

  it("handles empty body (POST 201) without JSON parse error", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => makeFetchResponse(null, 201));
    const client = new DiscogsClient("TestApp/1.0");
    const result = await client.makeRequest("/test", { method: "POST" });
    expect((result as { _status?: number })._status).toBe(201);
  });

  it("serialises request body as JSON for POST", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => makeFetchResponse(null, 201));
    const client = new DiscogsClient("TestApp/1.0");
    await client.makeRequest("/test", { method: "POST", body: { foo: "bar" } });
    const [, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(opts.body).toBe(JSON.stringify({ foo: "bar" }));
    expect((opts.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });
});

// ---------------------------------------------------------------------------
// Search methods
// ---------------------------------------------------------------------------

describe("DiscogsClient.searchByCatalogNumber", () => {
  it("calls correct endpoint and returns results", async () => {
    const results = [{ id: 1, title: "Test Album" }];
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      makeFetchResponse({ results })
    );
    const client = new DiscogsClient("TestApp/1.0");
    const data = await client.searchByCatalogNumber("SHVL-804");
    expect(data).toEqual(results);
  });

  it("URL-encodes catalog number", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => makeFetchResponse({ results: [] }));
    const client = new DiscogsClient("TestApp/1.0");
    await client.searchByCatalogNumber("ABC 123");
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain("ABC%20123");
  });
});

describe("DiscogsClient.searchByArtistAndTitle", () => {
  it("calls correct endpoint and returns results", async () => {
    const results = [{ id: 2, title: "Dark Side" }];
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      makeFetchResponse({ results })
    );
    const client = new DiscogsClient("TestApp/1.0");
    const data = await client.searchByArtistAndTitle("Pink Floyd", "Dark Side");
    expect(data).toEqual(results);
  });

  it("URL-encodes artist and title", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => makeFetchResponse({ results: [] }));
    const client = new DiscogsClient("TestApp/1.0");
    // Test with a name containing a non-ASCII char; verify it appears percent-encoded in the URL
    await client.searchByArtistAndTitle("Björk", "Post");
    const [url] = fetchSpy.mock.calls[0] as [string];
    // The ö character (U+00F6) encodes to %C3%B6
    expect(url).toContain("Bj%C3%B6rk");
    expect(url).toContain("Post");
  });
});

describe("DiscogsClient.searchByUPC", () => {
  it("calls correct endpoint and returns results", async () => {
    const results = [{ id: 3, title: "Album" }];
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      makeFetchResponse({ results })
    );
    const client = new DiscogsClient("TestApp/1.0");
    const data = await client.searchByUPC("724384260804");
    expect(data).toEqual(results);
  });
});

// ---------------------------------------------------------------------------
// getRelease
// ---------------------------------------------------------------------------

describe("DiscogsClient.getRelease", () => {
  it("fetches and returns release data", async () => {
    const release = { id: 42, title: "Nevermind", artists: [{ name: "Nirvana" }] };
    vi.spyOn(globalThis, "fetch").mockImplementation(() => makeFetchResponse(release));
    const client = new DiscogsClient("TestApp/1.0");
    const data = await client.getRelease(42);
    expect(data.id).toBe(42);
    expect(data.title).toBe("Nevermind");
  });
});

// ---------------------------------------------------------------------------
// getUserCollection
// ---------------------------------------------------------------------------

describe("DiscogsClient.getUserCollection", () => {
  it("fetches first page of collection for given username", async () => {
    const collectionResponse = {
      pagination: { page: 1, pages: 1, per_page: 100, items: 2 },
      releases: [],
    };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => makeFetchResponse(collectionResponse));
    const client = new DiscogsClient("TestApp/1.0");
    const data = await client.getUserCollection("testuser");
    expect(data.pagination.items).toBe(2);
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain("testuser");
    expect(url).toContain("page=1");
  });

  it("URL-encodes username", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        makeFetchResponse({ pagination: { page: 1, pages: 1, per_page: 100, items: 0 }, releases: [] })
      );
    const client = new DiscogsClient("TestApp/1.0");
    await client.getUserCollection("test user");
    const [url] = fetchSpy.mock.calls[0] as [string];
    expect(url).toContain("test%20user");
  });
});

// ---------------------------------------------------------------------------
// addToCollection
// ---------------------------------------------------------------------------

describe("DiscogsClient.addToCollection", () => {
  it("calls POST on the collection endpoint", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => makeFetchResponse(null, 201));
    const client = new DiscogsClient("TestApp/1.0", "tok");
    await client.addToCollection("testuser", 123);
    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("testuser");
    expect(url).toContain("123");
    expect(opts.method).toBe("POST");
  });

  it("throws with status 409 if already in collection", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      makeFetchResponse({ message: "Already in collection" }, 409)
    );
    const client = new DiscogsClient("TestApp/1.0", "tok");
    await expect(client.addToCollection("user", 1)).rejects.toMatchObject({ status: 409 });
  });
});

// ---------------------------------------------------------------------------
// extractRecordSize
// ---------------------------------------------------------------------------

describe("DiscogsClient.extractRecordSize", () => {
  const client = new DiscogsClient("TestApp/1.0");

  it("returns null when formats is undefined", () => {
    expect(client.extractRecordSize(undefined)).toBeNull();
  });

  it("returns null when no Vinyl format present", () => {
    expect(client.extractRecordSize([{ name: "CD", qty: "1" }])).toBeNull();
  });

  it('returns 12" for standard LP', () => {
    expect(client.extractRecordSize(stdFormats)).toBe('12"');
  });

  it('returns 7" for 7-inch format', () => {
    const formats = [{ name: "Vinyl", qty: "1", descriptions: ['7"', "Single"] }];
    expect(client.extractRecordSize(formats)).toBe('7"');
  });

  it("returns null if no size indicator in descriptions", () => {
    const formats = [{ name: "Vinyl", qty: "1", descriptions: ["Album"] }];
    expect(client.extractRecordSize(formats)).toBeNull();
  });

  it("returns null when Vinyl format has no descriptions", () => {
    expect(client.extractRecordSize([{ name: "Vinyl", qty: "1" }])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractVinylColor
// ---------------------------------------------------------------------------

describe("DiscogsClient.extractVinylColor", () => {
  const client = new DiscogsClient("TestApp/1.0");

  it("returns null when formats is undefined", () => {
    expect(client.extractVinylColor(undefined)).toBeNull();
  });

  it("returns null when no Vinyl format present", () => {
    expect(client.extractVinylColor([{ name: "CD", qty: "1" }])).toBeNull();
  });

  it("extracts Blue Vinyl from descriptions", () => {
    expect(client.extractVinylColor(colorFormats)).toBe("Blue Vinyl");
  });

  it("returns null for plain black vinyl (no color keyword in descriptions)", () => {
    expect(client.extractVinylColor(stdFormats)).toBeNull();
  });

  it("falls back to format text field when color keyword found there", () => {
    const formats = [{ name: "Vinyl", qty: "1", descriptions: ['12"'], text: "Red Vinyl" }];
    expect(client.extractVinylColor(formats)).toBe("Red Vinyl");
  });

  it("returns null when Vinyl format has no descriptions", () => {
    expect(client.extractVinylColor([{ name: "Vinyl", qty: "1" }])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isShapedVinyl
// ---------------------------------------------------------------------------

describe("DiscogsClient.isShapedVinyl", () => {
  const client = new DiscogsClient("TestApp/1.0");

  it("returns false when formats is undefined", () => {
    expect(client.isShapedVinyl(undefined)).toBe(false);
  });

  it("returns false for standard vinyl", () => {
    expect(client.isShapedVinyl(stdFormats)).toBe(false);
  });

  it("returns true for Picture Disc", () => {
    expect(client.isShapedVinyl(shapedFormats)).toBe(true);
  });

  it("returns true for Shaped format", () => {
    expect(client.isShapedVinyl([{ name: "Vinyl", qty: "1", descriptions: ["Shaped"] }])).toBe(true);
  });

  it("returns false when Vinyl format has no descriptions", () => {
    expect(client.isShapedVinyl([{ name: "Vinyl", qty: "1" }])).toBe(false);
  });

  it("returns false when no Vinyl format present", () => {
    expect(client.isShapedVinyl([{ name: "CD", qty: "1" }])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createDiscogsClient factory
// ---------------------------------------------------------------------------

describe("createDiscogsClient", () => {
  it("returns a DiscogsClient instance", () => {
    expect(createDiscogsClient()).toBeInstanceOf(DiscogsClient);
  });

  it("creates a new instance on each call (not a singleton)", () => {
    const a = createDiscogsClient();
    const b = createDiscogsClient();
    expect(a).not.toBe(b);
  });

  it("uses DISCOGS_USER_AGENT env var if set", () => {
    const orig = process.env.DISCOGS_USER_AGENT;
    process.env.DISCOGS_USER_AGENT = "MyApp/2.0";
    expect(createDiscogsClient()).toBeInstanceOf(DiscogsClient);
    process.env.DISCOGS_USER_AGENT = orig;
  });
});
