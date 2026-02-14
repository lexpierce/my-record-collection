/**
 * Discogs API client with rate limiting
 * Handles all communication with the Discogs API
 *
 * Rate limits:
 * - Authenticated: 60 requests per minute
 * - Unauthenticated: 25 requests per minute
 */

/**
 * Interface for Discogs release data
 * Maps the relevant fields from the Discogs API response
 */
export interface DiscogsRelease {
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
  lowest_price?: number;
  community?: {
    rating?: {
      average?: number;
      count?: number;
    };
  };
}

/**
 * Interface for Discogs search result
 */
export interface DiscogsSearchResult {
  id: number;
  title: string;
  year: string;
  thumb: string;
  cover_image: string;
  resource_url: string;
  type: string;
  catno?: string;
  barcode?: string[];
}

/**
 * Rate limiter class to prevent exceeding Discogs API limits
 * Uses a token bucket algorithm for smooth rate limiting
 */
class RateLimiter {
  private lastRequestTime: number = 0;
  private readonly minimumDelayMilliseconds: number;

  /**
   * Creates a new rate limiter
   * @param requestsPerMinute - Maximum number of requests allowed per minute
   */
  constructor(requestsPerMinute: number) {
    // Calculate minimum delay between requests in milliseconds
    this.minimumDelayMilliseconds = (60 * 1000) / requestsPerMinute;
  }

  /**
   * Waits if necessary to respect rate limits before making a request
   */
  async waitForNextRequest(): Promise<void> {
    const currentTime = Date.now();
    const timeSinceLastRequest = currentTime - this.lastRequestTime;

    if (timeSinceLastRequest < this.minimumDelayMilliseconds) {
      const delayNeeded = this.minimumDelayMilliseconds - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, delayNeeded));
    }

    this.lastRequestTime = Date.now();
  }
}

/**
 * Discogs API client class
 * Provides methods to search and fetch release information
 */
export class DiscogsClient {
  private readonly baseUrl = "https://api.discogs.com";
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
   * Makes an authenticated request to the Discogs API
   * @param endpoint - API endpoint to call
   * @returns Parsed JSON response
   */
  private async makeRequest<T>(endpoint: string): Promise<T> {
    // Wait for rate limiter before making request
    await this.rateLimiter.waitForNextRequest();

    const headers: HeadersInit = {
      "User-Agent": this.userAgent,
    };

    // Add authorization header if token is provided
    if (this.token) {
      headers["Authorization"] = `Discogs token=${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers,
      // Cache responses for 1 hour to reduce API calls
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(
        `Discogs API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Searches for releases by catalog number
   * @param catalogNumber - The catalog number to search for
   * @returns Array of matching releases
   */
  async searchByCatalogNumber(
    catalogNumber: string
  ): Promise<DiscogsSearchResult[]> {
    const encodedCatalogNumber = encodeURIComponent(catalogNumber);
    const response = await this.makeRequest<{ results: DiscogsSearchResult[] }>(
      `/database/search?catno=${encodedCatalogNumber}&type=release`
    );
    return response.results;
  }

  /**
   * Searches for releases by artist and title
   * @param artistName - The artist name
   * @param albumTitle - The album title
   * @returns Array of matching releases
   */
  async searchByArtistAndTitle(
    artistName: string,
    albumTitle: string
  ): Promise<DiscogsSearchResult[]> {
    const encodedArtist = encodeURIComponent(artistName);
    const encodedTitle = encodeURIComponent(albumTitle);
    const response = await this.makeRequest<{ results: DiscogsSearchResult[] }>(
      `/database/search?artist=${encodedArtist}&title=${encodedTitle}&type=release`
    );
    return response.results;
  }

  /**
   * Searches for releases by UPC/barcode
   * @param upcCode - The UPC/barcode to search for
   * @returns Array of matching releases
   */
  async searchByUPC(upcCode: string): Promise<DiscogsSearchResult[]> {
    const encodedUPC = encodeURIComponent(upcCode);
    const response = await this.makeRequest<{ results: DiscogsSearchResult[] }>(
      `/database/search?barcode=${encodedUPC}&type=release`
    );
    return response.results;
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
   * Fetches marketplace statistics for a release
   * @param releaseId - The Discogs release ID
   * @returns Marketplace statistics including pricing information
   */
  async getReleaseMarketStats(releaseId: number): Promise<{
    lowest_price?: { value: number; currency: string };
    num_for_sale?: number;
  }> {
    try {
      const stats = await this.makeRequest<{
        lowest_price?: { value: number; currency: string };
        num_for_sale?: number;
      }>(`/marketplace/stats/${releaseId}`);
      return stats;
    } catch (error) {
      // Marketplace stats may not be available for all releases
      console.warn(`Marketplace stats not available for release ${releaseId}`);
      return {};
    }
  }
}

/**
 * Creates and exports a singleton Discogs client instance
 * Uses environment variables for configuration
 */
export function createDiscogsClient(): DiscogsClient {
  const userAgent = process.env.DISCOGS_USER_AGENT || "MyRecordCollection/1.0";
  const token = process.env.DISCOGS_TOKEN;

  return new DiscogsClient(userAgent, token);
}
