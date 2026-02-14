import { NextRequest, NextResponse } from "next/server";
import { createDiscogsClient } from "@/lib/discogs/client";
import { database, schema } from "@/lib/db/client";

/**
 * API route for fetching a release from Discogs and saving it to the database
 *
 * POST: Fetches detailed release information from Discogs and stores it in the database
 *
 * Request body:
 * - releaseId: The Discogs release ID to fetch
 *
 * Example usage:
 * POST /api/records/fetch-from-discogs
 * Body: { "releaseId": 123456 }
 */
export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const releaseId = requestBody.releaseId;

    if (!releaseId) {
      return NextResponse.json(
        { error: "releaseId is required" },
        { status: 400 }
      );
    }

    // Create Discogs client
    const discogsClient = createDiscogsClient();

    // Fetch release details from Discogs
    const releaseData = await discogsClient.getRelease(releaseId);

    // Fetch marketplace stats for pricing information
    const marketStats = await discogsClient.getReleaseMarketStats(releaseId);

    // Extract artist name (use first artist if multiple)
    const artistName = releaseData.artists[0]?.name || "Unknown Artist";

    // Extract label name and catalog number
    const labelName = releaseData.labels[0]?.name || null;
    const catalogNumber = releaseData.labels[0]?.catno || null;

    // Prepare record data for database insertion
    const newRecordData = {
      artistName,
      albumTitle: releaseData.title,
      yearReleased: releaseData.year || null,
      labelName,
      catalogNumber,
      discogsId: releaseData.id.toString(),
      discogsUri: releaseData.uri,
      currentValueMinimum: marketStats.lowest_price?.value?.toString() || null,
      currentValueMedian: null, // Discogs doesn't provide median in basic stats
      currentValueMaximum: null,
      valueCurrency: marketStats.lowest_price?.currency || "USD",
      thumbnailUrl: releaseData.thumb,
      coverImageUrl: releaseData.cover_image,
      genres: releaseData.genres || [],
      styles: releaseData.styles || [],
      dataSource: "discogs" as const,
    };

    // Insert the record into the database
    const insertedRecords = await database
      .insert(schema.recordsTable)
      .values(newRecordData)
      .returning();

    const savedRecord = insertedRecords[0];

    return NextResponse.json(
      {
        record: savedRecord,
        message: "Record fetched from Discogs and saved successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error fetching from Discogs:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch from Discogs",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
