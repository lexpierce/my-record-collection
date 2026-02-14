/**
 * Discogs API client with rate limiting
 * Handles all communication with the Discogs API
 *
 * Rate limits:
 * - Authenticated: 60 requests per minute
 * - Unauthenticated: 25 requests per minute
 */

/**
 * Interface for Discogs format information
 * Contains vinyl-specific details like size and color
 */
export interface DiscogsFormat {
  name: string; // e.g., "Vinyl", "CD"
  qty: string; // quantity
  descriptions?: string[]; // e.g., ["LP", "Album", "12\"", "33 ⅓ RPM", "Blue Vinyl"]
  text?: string; // additional format text
}

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
  formats?: DiscogsFormat[]; // vinyl format details
  lowest_price?: number;
  community?: {
    rating?: {
      average?: number;
      count?: number;
    };
  };
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

export interface DiscogsCollectionResponse {
  pagination: {
    page: number;
    pages: number;
    per_page: number;
    items: number;
  };
  releases: DiscogsCollectionRelease[];
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
  async makeRequest<T>(
    endpoint: string,
    options?: { method?: string; body?: unknown },
  ): Promise<T & { _status?: number }> {
    await this.rateLimiter.waitForNextRequest();

    const headers: HeadersInit = {
      "User-Agent": this.userAgent,
    };

    if (this.token) {
      headers["Authorization"] = `Discogs token=${this.token}`;
    }

    const fetchOptions: RequestInit & { next?: { revalidate: number } } = {
      method: options?.method || "GET",
      headers,
    };

    if (options?.body) {
      headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(options.body);
    } else if (fetchOptions.method === "GET") {
      fetchOptions.next = { revalidate: 3600 };
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, fetchOptions);

    if (!response.ok) {
      const err = new Error(
        `Discogs API error: ${response.status} ${response.statusText}`,
      ) as Error & { status: number };
      err.status = response.status;
      throw err;
    }

    // Some POST endpoints return 201 with empty body
    const text = await response.text();
    if (!text) return { _status: response.status } as T & { _status?: number };
    return JSON.parse(text);
  }

  /**
   * Searches for releases by catalog number (vinyl only)
   * @param catalogNumber - The catalog number to search for
   * @returns Array of matching vinyl releases
   */
  async searchByCatalogNumber(
    catalogNumber: string
  ): Promise<DiscogsSearchResult[]> {
    const encodedCatalogNumber = encodeURIComponent(catalogNumber);
    const response = await this.makeRequest<{ results: DiscogsSearchResult[] }>(
      `/database/search?catno=${encodedCatalogNumber}&type=release&format=Vinyl`
    );
    return response.results;
  }

  /**
   * Searches for releases by artist and title (vinyl only)
   * @param artistName - The artist name
   * @param albumTitle - The album title
   * @returns Array of matching vinyl releases
   */
  async searchByArtistAndTitle(
    artistName: string,
    albumTitle: string
  ): Promise<DiscogsSearchResult[]> {
    const encodedArtist = encodeURIComponent(artistName);
    const encodedTitle = encodeURIComponent(albumTitle);
    const response = await this.makeRequest<{ results: DiscogsSearchResult[] }>(
      `/database/search?artist=${encodedArtist}&title=${encodedTitle}&type=release&format=Vinyl`
    );
    return response.results;
  }

  /**
   * Searches for releases by UPC/barcode (vinyl only)
   * @param upcCode - The UPC/barcode to search for
   * @returns Array of matching vinyl releases
   */
  async searchByUPC(upcCode: string): Promise<DiscogsSearchResult[]> {
    const encodedUPC = encodeURIComponent(upcCode);
    const response = await this.makeRequest<{ results: DiscogsSearchResult[] }>(
      `/database/search?barcode=${encodedUPC}&type=release&format=Vinyl`
    );
    return response.results;
  }

  /**
   * Extracts record size from format descriptions
   * @param formats - Array of format objects from Discogs
   * @returns Record size (e.g., "12\"", "7\"") or null
   */
  extractRecordSize(formats?: DiscogsFormat[]): string | null {
    if (!formats) return null;

    const vinylFormat = formats.find(f => f.name === "Vinyl");
    if (!vinylFormat?.descriptions) return null;

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
    if (!formats) return null;

    const vinylFormat = formats.find(f => f.name === "Vinyl");
    if (!vinylFormat?.descriptions) return null;

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
    if (!formats) return false;

    const vinylFormat = formats.find(f => f.name === "Vinyl");
    if (!vinylFormat?.descriptions) return false;

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
   * Fetches marketplace statistics for a release
   * @param releaseId - The Discogs release ID
   * @returns Marketplace statistics including pricing information
   */
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

  /**
   * Adds a release to the user's Discogs collection (folder 1 = uncategorized)
   * Returns 201 on success, throws 409 if already in collection
   */
  async addToCollection(username: string, releaseId: number): Promise<void> {
    await this.makeRequest(
      `/users/${encodeURIComponent(username)}/collection/folders/1/releases/${releaseId}`,
      { method: "POST" },
    );
  }

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
