import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  applySecurityHeaders,
  authorizeApiRequest,
  SECURITY_HEADERS,
} from "@/lib/http/guard";

const TOKEN = "s3cret-token";

function req(
  method: string,
  path: string,
  headers: Record<string, string> = {},
): { request: Request; url: URL } {
  const url = new URL(`https://app.example.com${path}`);
  return { request: new Request(url, { method, headers }), url };
}

let saved: string | undefined;

beforeEach(() => {
  saved = process.env.APP_AUTH_TOKEN;
  process.env.APP_AUTH_TOKEN = TOKEN;
});

afterEach(() => {
  if (saved === undefined) delete process.env.APP_AUTH_TOKEN;
  else process.env.APP_AUTH_TOKEN = saved;
});

describe("authorizeApiRequest", () => {
  it("allows GET requests without a token", () => {
    const { request, url } = req("GET", "/api/records");
    expect(authorizeApiRequest(request, url)).toBeNull();
  });

  it("allows non-API mutating requests (handled elsewhere)", () => {
    const { request, url } = req("POST", "/not-api");
    expect(authorizeApiRequest(request, url)).toBeNull();
  });

  it("rejects mutating API requests with no token (401)", () => {
    const { request, url } = req("POST", "/api/records/sync");
    expect(authorizeApiRequest(request, url)?.status).toBe(401);
  });

  it("rejects mutating API requests with a wrong token (401)", () => {
    const { request, url } = req("DELETE", "/api/records/x", {
      Authorization: "Bearer nope",
    });
    expect(authorizeApiRequest(request, url)?.status).toBe(401);
  });

  it("allows mutating API requests with the correct token", () => {
    const { request, url } = req("POST", "/api/records/sync", {
      Authorization: `Bearer ${TOKEN}`,
    });
    expect(authorizeApiRequest(request, url)).toBeNull();
  });

  it("fails closed with 503 when APP_AUTH_TOKEN is unset", () => {
    delete process.env.APP_AUTH_TOKEN;
    const { request, url } = req("POST", "/api/records/sync", {
      Authorization: "Bearer anything",
    });
    expect(authorizeApiRequest(request, url)?.status).toBe(503);
  });

  it("rejects cross-origin mutating requests (403)", () => {
    const { request, url } = req("POST", "/api/records/sync", {
      Authorization: `Bearer ${TOKEN}`,
      Origin: "https://evil.example.com",
    });
    expect(authorizeApiRequest(request, url)?.status).toBe(403);
  });

  it("allows same-origin mutating requests", () => {
    const { request, url } = req("POST", "/api/records/sync", {
      Authorization: `Bearer ${TOKEN}`,
      Origin: "https://app.example.com",
    });
    expect(authorizeApiRequest(request, url)).toBeNull();
  });
});

describe("applySecurityHeaders", () => {
  it("sets all security headers for normal paths", () => {
    const headers = new Headers();
    applySecurityHeaders(headers, "/");
    for (const key of Object.keys(SECURITY_HEADERS)) {
      expect(headers.get(key)).toBe(SECURITY_HEADERS[key]);
    }
  });

  it("skips headers for the health-check path", () => {
    const headers = new Headers();
    applySecurityHeaders(headers, "/am_i_evil");
    expect(headers.get("Content-Security-Policy")).toBeNull();
  });
});
