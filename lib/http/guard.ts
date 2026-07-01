/**
 * Pure HTTP guard helpers used by the Astro middleware.
 *
 * Kept free of any `astro:*` imports so they can be unit-tested directly.
 */

/** Paths exempt from security headers (e.g. the standalone health-check page). */
const HEADER_EXEMPT_PATHS = new Set<string>(["/am_i_evil"]);

export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "Content-Security-Policy": [
    "default-src 'self'",
    "img-src 'self' data: https://*.discogs.com",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join("; "),
};

function isMutating(method: string): boolean {
  return method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
}

function jsonError(error: string, message: string, status: number): Response {
  return new Response(JSON.stringify({ error, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Authorises a state-changing API request.
 *
 * Returns a Response to short-circuit (deny), or null to allow.
 * - Only applies to mutating methods under `/api/`.
 * - Fails closed with 503 if APP_AUTH_TOKEN is not configured.
 * - Requires `Authorization: Bearer <APP_AUTH_TOKEN>`.
 * - Rejects cross-origin writes (CSRF) when an Origin header is present.
 *   Compares only the Origin host against the request host, ignoring scheme,
 *   so it works behind a TLS-terminating proxy where the server sees `http`
 *   while the browser used `https`.
 */
export function authorizeApiRequest(request: Request, url: URL): Response | null {
  if (!url.pathname.startsWith("/api/") || !isMutating(request.method)) {
    return null;
  }

  const expected = process.env.APP_AUTH_TOKEN;
  if (!expected) {
    return jsonError("Server misconfigured", "APP_AUTH_TOKEN is not set", 503);
  }

  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${expected}`) {
    return jsonError("Unauthorized", "Valid bearer token required", 401);
  }

  const origin = request.headers.get("Origin");
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      return jsonError("Forbidden", "Cross-origin request rejected", 403);
    }
    if (originHost !== url.host) {
      return jsonError("Forbidden", "Cross-origin request rejected", 403);
    }
  }

  return null;
}

/** Applies security headers in place unless the path is exempt. */
export function applySecurityHeaders(headers: Headers, pathname: string): void {
  if (HEADER_EXEMPT_PATHS.has(pathname)) return;
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
}
