import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSelect } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  getDatabase: () => ({
    select: mockSelect,
  }),
  schema: {
    recordsTable: {
      createdAt: "created_at",
      artistName: "artist_name",
      albumTitle: "album_title",
      yearReleased: "year_released",
      recordSize: "record_size",
      isShapedVinyl: "is_shaped_vinyl",
    },
  },
}));

vi.mock("drizzle-orm", () => ({
  asc: (col: unknown) => ({ asc: col }),
  desc: (col: unknown) => ({ desc: col }),
  inArray: (col: unknown, vals: unknown) => ({ inArray: { col, vals } }),
  eq: (col: unknown, val: unknown) => ({ eq: { col, val } }),
  and: (...args: unknown[]) => ({ and: args }),
}));

function drizzleChain(resolveValue: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["from", "orderBy", "values", "returning", "where", "set", "$dynamic"];
  for (const method of methods) chain[method] = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: (value: unknown) => void) => resolve(resolveValue);
  return chain;
}

function makeGetRequest(params: Record<string, string | string[]> = {}) {
  const url = new URL("http://localhost/api/records");
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, item);
    } else {
      url.searchParams.set(key, value);
    }
  }
  return new Request(url.toString());
}

import { GET } from "@/src/pages/api/records";

const mockRecord = {
  recordId: "uuid-1",
  artistName: "Nirvana",
  albumTitle: "Nevermind",
  yearReleased: 1991,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSelect.mockReturnValue(drizzleChain([mockRecord]));
});

describe("GET /api/records", () => {
  it("returns 200 with records array", async () => {
    const response = await GET({ request: makeGetRequest() });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.records)).toBe(true);
    expect(body.records[0].albumTitle).toBe("Nevermind");
  });

  it("includes count field", async () => {
    const response = await GET({ request: makeGetRequest() });
    const body = await response.json();
    expect(body.count).toBe(1);
  });

  it("returns 500 when database throws", async () => {
    mockSelect.mockImplementationOnce(() => {
      throw new Error("DB error");
    });
    const response = await GET({ request: makeGetRequest() });
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("accepts sortBy=artist without error", async () => {
    const response = await GET({ request: makeGetRequest({ sortBy: "artist" }) });
    expect(response.status).toBe(200);
  });

  it("accepts sortBy=title without error", async () => {
    const response = await GET({ request: makeGetRequest({ sortBy: "title" }) });
    expect(response.status).toBe(200);
  });

  it("accepts sortBy=year without error", async () => {
    const response = await GET({ request: makeGetRequest({ sortBy: "year" }) });
    expect(response.status).toBe(200);
  });

  it("falls back to createdAt for unknown sortBy", async () => {
    const response = await GET({ request: makeGetRequest({ sortBy: "nonsense" }) });
    expect(response.status).toBe(200);
  });

  it("accepts sortDir=asc", async () => {
    const response = await GET({ request: makeGetRequest({ sortBy: "artist", sortDir: "asc" }) });
    expect(response.status).toBe(200);
  });

  it("accepts size filter", async () => {
    const response = await GET({ request: makeGetRequest({ size: '12"' }) });
    expect(response.status).toBe(200);
  });

  it("accepts multiple size filters", async () => {
    const response = await GET({ request: makeGetRequest({ size: ['12"', '7"'] }) });
    expect(response.status).toBe(200);
  });

  it("accepts shaped=true filter", async () => {
    const response = await GET({ request: makeGetRequest({ shaped: "true" }) });
    expect(response.status).toBe(200);
  });
});
