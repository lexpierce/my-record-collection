import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

class MockBunImage {
  static instances: MockBunImage[] = [];

  input: unknown;
  resize = vi.fn().mockReturnThis();
  webp = vi.fn().mockReturnThis();
  blob = vi.fn(async () => new Blob(["webp"], { type: "image/webp" }));

  constructor(input: unknown) {
    this.input = input;
    MockBunImage.instances.push(this);
  }
}

type TestGlobal = typeof globalThis & { Bun?: { Image: typeof MockBunImage } };

const testGlobal = globalThis as TestGlobal;
const originalBun = testGlobal.Bun;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  MockBunImage.instances = [];
  testGlobal.Bun = { Image: MockBunImage };
  globalThis.fetch = vi.fn(async () => new Response("source", {
    headers: { "Content-Type": "image/jpeg" },
  }));
});

afterEach(() => {
  testGlobal.Bun = originalBun;
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

import { GET } from "@/src/pages/api/records/image";

describe("GET /api/records/image", () => {
  it("resizes remote images with Bun.Image and returns WebP", async () => {
    const response = await GET({
      request: new Request("http://localhost/api/records/image?src=https%3A%2F%2Fi.discogs.com%2Fcover.jpg&size=216"),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(globalThis.fetch).toHaveBeenCalledWith(new URL("https://i.discogs.com/cover.jpg"), {
      headers: { "User-Agent": "MyRecordCollection/1.0" },
    });
    expect(MockBunImage.instances).toHaveLength(1);
    expect(MockBunImage.instances[0].input).toBeInstanceOf(Blob);
    expect(MockBunImage.instances[0].resize).toHaveBeenCalledWith(216, 216, {
      fit: "inside",
      withoutEnlargement: true,
    });
    expect(MockBunImage.instances[0].webp).toHaveBeenCalledWith({ quality: 82 });
  });

  it("rejects missing source", async () => {
    const response = await GET({ request: new Request("http://localhost/api/records/image") });

    expect(response.status).toBe(400);
  });

  it("rejects non-http source", async () => {
    const response = await GET({
      request: new Request("http://localhost/api/records/image?src=file%3A%2F%2F%2Fetc%2Fpasswd"),
    });

    expect(response.status).toBe(400);
  });

  it("rejects non-Discogs source", async () => {
    const response = await GET({
      request: new Request("http://localhost/api/records/image?src=https%3A%2F%2Fexample.com%2Fcover.jpg"),
    });

    expect(response.status).toBe(400);
  });

  it("clamps oversize requests", async () => {
    const response = await GET({
      request: new Request("http://localhost/api/records/image?src=https%3A%2F%2Fi.discogs.com%2Fcover.jpg&size=99999"),
    });

    expect(response.status).toBe(200);
    expect(MockBunImage.instances[0].resize).toHaveBeenCalledWith(1200, 1200, {
      fit: "inside",
      withoutEnlargement: true,
    });
  });

  it("returns 502 when upstream image fetch fails", async () => {
    globalThis.fetch = vi.fn(async () => new Response("missing", { status: 404 }));

    const response = await GET({
      request: new Request("http://localhost/api/records/image?src=https%3A%2F%2Fi.discogs.com%2Fmissing.jpg"),
    });

    expect(response.status).toBe(502);
    expect(MockBunImage.instances).toHaveLength(0);
  });

  it("returns 500 when Bun.Image is unavailable (non-Bun runtime)", async () => {
    delete testGlobal.Bun;

    const response = await GET({
      request: new Request("http://localhost/api/records/image?src=https%3A%2F%2Fi.discogs.com%2Fcover.jpg"),
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Image processing unavailable");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
