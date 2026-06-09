import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getDatabaseUrl,
  getDiscogsConfig,
  getDiscogsUserAgent,
  getDiscogsUsername,
  missingSyncEnv,
} from "@/lib/env";

const ENV_KEYS = [
  "DATABASE_URL",
  "DISCOGS_USER_AGENT",
  "DISCOGS_TOKEN",
  "DISCOGS_USERNAME",
] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("getDatabaseUrl", () => {
  it("returns the value when it is a valid postgres URL", () => {
    process.env.DATABASE_URL = "postgres://u:p@host:5432/db";
    expect(getDatabaseUrl()).toBe("postgres://u:p@host:5432/db");
  });

  it("accepts the postgresql:// scheme", () => {
    process.env.DATABASE_URL = "postgresql://u:p@host/db";
    expect(getDatabaseUrl()).toBe("postgresql://u:p@host/db");
  });

  it("throws when unset", () => {
    expect(() => getDatabaseUrl()).toThrow("DATABASE_URL");
  });

  it("throws when not a postgres connection string", () => {
    process.env.DATABASE_URL = "mysql://u:p@host/db";
    expect(() => getDatabaseUrl()).toThrow("postgres");
  });
});

describe("getDiscogsConfig / getDiscogsUserAgent", () => {
  it("falls back to the default user agent", () => {
    expect(getDiscogsUserAgent()).toBe("MyRecordCollection/1.0");
    expect(getDiscogsConfig().userAgent).toBe("MyRecordCollection/1.0");
  });

  it("uses configured user agent and token", () => {
    process.env.DISCOGS_USER_AGENT = "Custom/2.0";
    process.env.DISCOGS_TOKEN = "tok";
    expect(getDiscogsConfig()).toEqual({ userAgent: "Custom/2.0", token: "tok" });
  });

  it("omits token when unset", () => {
    expect(getDiscogsConfig().token).toBeUndefined();
  });
});

describe("getDiscogsUsername", () => {
  it("returns the username when set", () => {
    process.env.DISCOGS_USERNAME = "lexpierce";
    expect(getDiscogsUsername()).toBe("lexpierce");
  });

  it("throws when unset", () => {
    expect(() => getDiscogsUsername()).toThrow("DISCOGS_USERNAME");
  });
});

describe("missingSyncEnv", () => {
  it("lists all required vars when none are set", () => {
    expect(missingSyncEnv()).toEqual(["DISCOGS_USERNAME", "DISCOGS_TOKEN"]);
  });

  it("returns an empty array when all are set", () => {
    process.env.DISCOGS_USERNAME = "lexpierce";
    process.env.DISCOGS_TOKEN = "tok";
    expect(missingSyncEnv()).toEqual([]);
  });

  it("reports only the missing var", () => {
    process.env.DISCOGS_USERNAME = "lexpierce";
    expect(missingSyncEnv()).toEqual(["DISCOGS_TOKEN"]);
  });
});
