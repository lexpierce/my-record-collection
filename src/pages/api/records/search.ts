import { createDiscogsClient } from "@/lib/discogs/client";
import { errorResponse, getErrorMessage, jsonResponse } from "../_helpers";

export async function GET({ request }: { request: Request }): Promise<Response> {
  try {
    const searchParams = new URL(request.url).searchParams;
    const catalogNumber = searchParams.get("catalogNumber");
    const artistName = searchParams.get("artist");
    const albumTitle = searchParams.get("title");
    const upcCode = searchParams.get("upc");

    const discogsClient = createDiscogsClient();

    let searchResults;

    if (catalogNumber) {
      searchResults = await discogsClient.searchByCatalogNumber(catalogNumber);
    } else if (artistName && albumTitle) {
      searchResults = await discogsClient.searchByArtistAndTitle(
        artistName,
        albumTitle,
      );
    } else if (upcCode) {
      searchResults = await discogsClient.searchByUPC(upcCode);
    } else {
      return jsonResponse(
        {
          error:
            "Please provide either catalogNumber, (artist and title), or upc",
        },
        400,
      );
    }

    const resultsWithDetails = await Promise.all(
      searchResults.slice(0, 10).map(async (result) => {
        try {
          const releaseData = await discogsClient.getRelease(result.id);
          const recordSize = discogsClient.extractRecordSize(
            releaseData.formats,
          );
          const vinylColor = discogsClient.extractVinylColor(
            releaseData.formats,
          );
          const isShapedVinyl = discogsClient.isShapedVinyl(
            releaseData.formats,
          );

          return {
            ...result,
            recordSize,
            vinylColor,
            isShapedVinyl,
          };
        } catch {
          console.warn(`Failed to fetch details for release ${result.id}`);
          return result;
        }
      }),
    );

    return jsonResponse({
      results: resultsWithDetails,
      count: resultsWithDetails.length,
    });
  } catch (error) {
    console.error("Error searching Discogs:", error);
    return errorResponse("Failed to search Discogs", getErrorMessage(error), 500);
  }
}
