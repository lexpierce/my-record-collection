import { NextRequest, NextResponse } from "next/server";
import { createDiscogsClient } from "@/lib/discogs/client";

/**
 * API route for searching records using Discogs API
 * Supports three search methods: catalog number, artist/title, and UPC code
 *
 * Query parameters:
 * - catalogNumber: Search by catalog number
 * - artist & title: Search by artist name and album title
 * - upc: Search by UPC/barcode
 *
 * Example usage:
 * - GET /api/records/search?catalogNumber=ABC-123
 * - GET /api/records/search?artist=Pink Floyd&title=Dark Side
 * - GET /api/records/search?upc=123456789
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const catalogNumber = searchParams.get("catalogNumber");
    const artistName = searchParams.get("artist");
    const albumTitle = searchParams.get("title");
    const upcCode = searchParams.get("upc");

    // Create Discogs client
    const discogsClient = createDiscogsClient();

    let searchResults;

    // Determine which search method to use based on query parameters
    if (catalogNumber) {
      // Search by catalog number
      searchResults = await discogsClient.searchByCatalogNumber(catalogNumber);
    } else if (artistName && albumTitle) {
      // Search by artist and title
      searchResults = await discogsClient.searchByArtistAndTitle(
        artistName,
        albumTitle
      );
    } else if (upcCode) {
      // Search by UPC code
      searchResults = await discogsClient.searchByUPC(upcCode);
    } else {
      // No valid search parameters provided
      return NextResponse.json(
        {
          error:
            "Please provide either catalogNumber, (artist and title), or upc",
        },
        { status: 400 }
      );
    }

    // Return search results
    return NextResponse.json({
      results: searchResults,
      count: searchResults.length,
    });
  } catch (error) {
    console.error("Error searching Discogs:", error);
    return NextResponse.json(
      {
        error: "Failed to search Discogs",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
