/**
 * Runtime capability checks.
 *
 * The image endpoint depends on `Bun.Image`, which only exists when the server
 * runs under the Bun runtime. These helpers let the app warn loudly at startup
 * and fail with a clear message instead of an opaque 500.
 */

interface BunImageGlobal {
  Bun?: { Image?: unknown };
}

/** True when `globalThis.Bun.Image` is available (Bun runtime). */
export function hasBunImage(): boolean {
  return typeof (globalThis as unknown as BunImageGlobal).Bun?.Image === "function";
}

let warned = false;

/**
 * Logs a one-time startup warning if `Bun.Image` is missing. Imported by the
 * middleware so it runs once when the SSR server boots.
 */
export function warnIfBunImageMissing(): void {
  if (warned) return;
  warned = true;
  if (!hasBunImage()) {
    console.warn(
      "[startup] Bun.Image is unavailable — /api/records/image requires the Bun runtime. " +
        "Start the server with Bun (`bun run start`); image requests will return 500 otherwise.",
    );
  }
}
