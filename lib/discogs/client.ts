/**
 * Discogs API client with rate limiting
 * Handles all communication with the Discogs API
 *
 * Rate limits:
 * - Authenticated: 60 requests per minute
 * - Unauthenticated: 25 requests per minute
 */

import { getDiscogsConfig } from "@/lib/env";

/**
 * Interface for Discogs format information
 * Contains vinyl-specific details like size and color
 */
interface DiscogsFormat {
  name: string; // e.g., "Vinyl", "CD"
  qty: string; // quantity
  descriptions?: string[]; // e.g., ["LP", "Album", "12\"", "33 ⅓ RPM", "Blue Vinyl"]
  text?: string; // additional format text
}

/**
 * Interface for Discogs release data
 * Maps the relevant fields from the Discogs API response
 */
interface DiscogsRelease {
  id: number;
  title: string;
  artists: Array<{ name: string }>;
  year: number;
  labels: Array<{ name: string; catno: string }>;
  genres: string[];
  styles: string[];
  thumb: string;
  cover_image: string;
  uri: string;
  formats?: DiscogsFormat[]; // vinyl format details
}

/**
 * Basic release info returned by the Discogs collection API
 * Subset of full release — enough to create a DB record without per-item getRelease()
 */
export interface DiscogsCollectionBasicInfo {
  id: number;
  title: string;
  year: number;
  thumb: string;
  cover_image: string;
  formats: DiscogsFormat[];
  labels: Array<{ name: string; catno: string }>;
  genres: string[];
  styles: string[];
  artists: Array<{ name: string }>;
  resource_url: string;
}

export interface DiscogsCollectionRelease {
  id: number; // instance_id
  rating: number;
  basic_information: DiscogsCollectionBasicInfo;
}

interface DiscogsCollectionResponse {
  pagination: {
    page: number;
    pages: number;
    per_page: number;
    items: number;
  };
  releases: DiscogsCollectionRelease[];
}

/**
 * Rate limiter class to prevent exceeding Discogs API limits
 * Uses a token bucket algorithm for smooth rate limiting
 */
class RateLimiter {
  private lastRequestTime: number = 0;
  private readonly minDelayMs: number;

  /**
   * Creates a new rate limiter
   * @param requestsPerMinute - Maximum number of requests allowed per minute
   */
  constructor(requestsPerMinute: number) {
    this.minDelayMs = (60 * 1000) / requestsPerMinute;
  }

  /**
   * Waits if necessary to respect rate limits before making a request
   */
  async waitForNextRequest(): Promise<void> {
    const currentTime = Date.now();
    const timeSinceLastRequest = currentTime - this.lastRequestTime;

    if (timeSinceLastRequest < this.minDelayMs) {
      const delayNeeded = this.minDelayMs - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, delayNeeded));
    }

    this.lastRequestTime = Date.now();
  }
}

/**
 * Discogs API client class (read-only)
 * Provides methods to fetch release information and the user's collection.
 * It never writes to the Discogs collection.
 */
export class DiscogsClient {
  private readonly baseURL = "https://api.discogs.com";
  private readonly userAgent: string;
  private readonly token?: string;
  private readonly rateLimiter: RateLimiter;

  /**
   * Creates a new Discogs API client
   * @param userAgent - User agent string (required by Discogs API)
   * @param token - Optional personal access token for higher rate limits
   */
  constructor(userAgent: string, token?: string) {
    this.userAgent = userAgent;
    this.token = token;
    // Use higher rate limit if authenticated, otherwise use lower limit
    this.rateLimiter = new RateLimiter(token ? 60 : 25);
  }

  /**
   * Makes an authenticated GET request to the Discogs API.
   *
   * Retries up to 3 times on 429 (Too Many Requests) responses, using
   * exponential backoff seeded by the Retry-After header (default 1 s).
   * All other non-2xx responses throw immediately.
   *
   * This client is read-only: it never writes to the Discogs collection.
   *
   * @param endpoint - API endpoint to call
   * @returns Parsed JSON response
   */
  async makeRequest<T>(endpoint: string): Promise<T> {
    await this.rateLimiter.waitForNextRequest();

    const headers: HeadersInit = {
      "User-Agent": this.userAgent,
    };

    if (this.token) {
      headers["Authorization"] = `Discogs token=${this.token}`;
    }

    const fetchOptions: RequestInit & { next?: { revalidate: number } } = {
      method: "GET",
      headers,
      next: { revalidate: 3600 },
    };

    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const response = await fetch(`${this.baseURL}${endpoint}`, fetchOptions);

      if (response.status === 429) {
        if (attempt === maxRetries - 1) {
          const err = new Error(
            `Discogs API error: 429 Too Many Requests (max retries exceeded)`,
          ) as Error & { status: number };
          err.status = 429;
          throw err;
        }
        // Honour Retry-After header; fall back to 1 s, then double per attempt
        const retryAfterSeconds = parseInt(response.headers.get("Retry-After") ?? "1", 10);
        const delayMs = retryAfterSeconds * 1000 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      if (!response.ok) {
        const err = new Error(
          `Discogs API error: ${response.status} ${response.statusText}`,
        ) as Error & { status: number };
        err.status = response.status;
        throw err;
      }

      return JSON.parse(await response.text());
    }

    // Unreachable — loop always returns or throws, but TypeScript needs this
    throw new Error("makeRequest: unexpected exit from retry loop");
  }

  /** Finds the Vinyl format entry with non-empty descriptions, if any. */
  private findVinylFormatWithDescriptions(
    formats?: DiscogsFormat[],
  ): (DiscogsFormat & { descriptions: string[] }) | null {
    if (!formats) return null;
    const vinylFormat = formats.find(f => f.name === "Vinyl");
    if (!vinylFormat?.descriptions) return null;
    return vinylFormat as DiscogsFormat & { descriptions: string[] };
  }

  /**
   * Extracts record size from format descriptions
   * @param formats - Array of format objects from Discogs
   * @returns Record size (e.g., "12\"", "7\"") or null
   */
  extractRecordSize(formats?: DiscogsFormat[]): string | null {
    const vinylFormat = this.findVinylFormatWithDescriptions(formats);
    if (!vinylFormat) return null;

    // Look for size indicators in descriptions
    const sizeMatch = vinylFormat.descriptions.find(d =>
      d.includes('"') || d.includes('inch') || d.includes('7') || d.includes('10') || d.includes('12')
    );

    return sizeMatch || null;
  }

  /**
   * Extracts vinyl color from format descriptions
   * @param formats - Array of format objects from Discogs
   * @returns Vinyl color description or null
   */
  extractVinylColor(formats?: DiscogsFormat[]): string | null {
    const vinylFormat = this.findVinylFormatWithDescriptions(formats);
    if (!vinylFormat) return null;

    // Common color-related keywords
    const colorKeywords = ['Vinyl', 'Colored', 'Clear', 'Transparent', 'Marble', 'Splatter',
                           'White', 'Black', 'Red', 'Blue', 'Green', 'Yellow', 'Purple',
                           'Pink', 'Orange', 'Grey', 'Gray'];

    const colorDesc = vinylFormat.descriptions.find(d =>
      colorKeywords.some(keyword => d.includes(keyword))
    );

    return colorDesc || (vinylFormat.text && colorKeywords.some(k => vinylFormat.text!.includes(k)) ? vinylFormat.text : null);
  }

  /**
   * Determines if the vinyl is shaped (non-round)
   * @param formats - Array of format objects from Discogs
   * @returns true if shaped/picture disc, false otherwise
   */
  isShapedVinyl(formats?: DiscogsFormat[]): boolean {
    const vinylFormat = this.findVinylFormatWithDescriptions(formats);
    if (!vinylFormat) return false;

    // Keywords indicating shaped/picture discs
    const shapedKeywords = ['Picture Disc', 'Shaped', 'Shape', 'Picture'];

    return vinylFormat.descriptions.some(d =>
      shapedKeywords.some(keyword => d.includes(keyword))
    );
  }

  /**
   * Fetches detailed information about a specific release
   * @param releaseId - The Discogs release ID
   * @returns Detailed release information
   */
  async getRelease(releaseId: number): Promise<DiscogsRelease> {
    return this.makeRequest<DiscogsRelease>(`/releases/${releaseId}`);
  }

  /**
   * Fetches a page of the user's Discogs collection (folder 0 = all)
   */
  async getUserCollection(
    username: string,
    page = 1,
    perPage = 100,
  ): Promise<DiscogsCollectionResponse> {
    return this.makeRequest<DiscogsCollectionResponse>(
      `/users/${encodeURIComponent(username)}/collection/folders/0/releases?page=${page}&per_page=${perPage}&sort=added&sort_order=desc`,
    );
  }

}

/**
 * Factory that creates a new DiscogsClient using environment variables.
 * Creates a fresh instance on every call — callers should reuse it within a request.
 *
 * Required env vars:
 *   DISCOGS_USER_AGENT — identifies your app to the Discogs API (required by their TOS)
 *   DISCOGS_TOKEN      — personal access token; omit for unauthenticated (25 req/min) access
 */
export function createDiscogsClient(): DiscogsClient {
  const { userAgent, token } = getDiscogsConfig();
  return new DiscogsClient(userAgent, token);
}
