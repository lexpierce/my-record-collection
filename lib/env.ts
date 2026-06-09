/**
 * Centralised, validated access to environment variables.
 *
 * All accessors are functions (not module-level constants) so validation runs
 * lazily at request time. This keeps `astro build` working in environments
 * (CI/CD, preview) where secrets such as DATABASE_URL are not present at build
 * time, while still failing fast with a clear message when a value is actually
 * needed and missing or malformed.
 */

const DEFAULT_USER_AGENT = "MyRecordCollection/1.0";

/** Environment variables required for Discogs collection sync. */
export const SYNC_REQUIRED_ENV = ["DISCOGS_USERNAME", "DISCOGS_TOKEN"] as const;

/**
 * Returns the validated Postgres connection string.
 * @throws if DATABASE_URL is missing or not a postgres connection string.
 */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is not defined. Please set it in your .env file.",
    );
  }
  if (!/^postgres(ql)?:\/\//.test(url)) {
    throw new Error(
      "DATABASE_URL must be a postgres:// or postgresql:// connection string.",
    );
  }
  return url;
}

export interface DiscogsConfig {
  userAgent: string;
  token?: string;
}

/**
 * Returns Discogs client configuration. The user agent falls back to a default
 * (required by the Discogs TOS); the token is optional (omit for the lower
 * unauthenticated rate limit).
 */
export function getDiscogsConfig(): DiscogsConfig {
  return {
    userAgent: getDiscogsUserAgent(),
    token: process.env.DISCOGS_TOKEN || undefined,
  };
}

/** Returns the Discogs User-Agent, falling back to a sensible default. */
export function getDiscogsUserAgent(): string {
  return process.env.DISCOGS_USER_AGENT || DEFAULT_USER_AGENT;
}

/**
 * Returns the Discogs username used for collection sync.
 * @throws if DISCOGS_USERNAME is not set.
 */
export function getDiscogsUsername(): string {
  const username = process.env.DISCOGS_USERNAME;
  if (!username) {
    throw new Error("DISCOGS_USERNAME environment variable is required for sync");
  }
  return username;
}

/** Lists which sync-required env vars are currently unset. */
export function missingSyncEnv(): string[] {
  return SYNC_REQUIRED_ENV.filter((name) => !process.env[name]);
}

/**
 * Returns the shared secret required for all state-changing API calls.
 * @throws if APP_AUTH_TOKEN is not set (fail closed — never allow unauthenticated writes).
 */
export function getAuthToken(): string {
  const token = process.env.APP_AUTH_TOKEN;
  if (!token) {
    throw new Error("APP_AUTH_TOKEN environment variable is required");
  }
  return token;
}

