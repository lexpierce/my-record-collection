import { NextRequest, NextResponse } from "next/server";
import { createDiscogsClient } from "@/lib/discogs/client";
import { getDatabase, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";

/**
 * API route for updating an existing record with fresh data from Discogs
 *
 * POST: Fetches updated release information from Discogs and updates the database record
 *
 * Request body:
 * - recordId: The database record ID (UUID) to update
 * - discogsId: The Discogs release ID to fetch fresh data from
 *
 * Example usage:
 * POST /api/records/update-from-discogs
 * Body: { "recordId": "uuid-here", "discogsId": "123456" }
 */
export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { recordId, discogsId } = requestBody;

    if (!recordId || !discogsId) {
      return NextResponse.json(
        { error: "recordId and discogsId are required" },
        { status: 400 }
      );
    }

    // Create Discogs client
    const discogsClient = createDiscogsClient();

    // Fetch fresh release details from Discogs
    const releaseData = await discogsClient.getRelease(parseInt(discogsId));

    // Extract artist name (use first artist if multiple)
    const artistName = releaseData.artists[0]?.name || "Unknown Artist";

    // Extract label name and catalog number
    const labelName = releaseData.labels[0]?.name || null;
    const catalogNumber = releaseData.labels[0]?.catno || null;

    // Extract vinyl-specific information using helper methods
    const recordSize = discogsClient.extractRecordSize(releaseData.formats);
    const vinylColor = discogsClient.extractVinylColor(releaseData.formats);
    const isShapedVinyl = discogsClient.isShapedVinyl(releaseData.formats);

    // Prepare updated record data
    const updatedRecordData = {
      artistName,
      albumTitle: releaseData.title,
      yearReleased: releaseData.year || null,
      labelName,
      catalogNumber,
      discogsUri: releaseData.uri,
      thumbnailUrl: releaseData.thumb,
      coverImageUrl: releaseData.cover_image,
      genres: releaseData.genres || [],
      styles: releaseData.styles || [],
      // Vinyl-specific data
      recordSize,
      vinylColor,
      isShapedVinyl,
      // Update timestamp
      updatedAt: new Date(),
    };

    // Update the record in the database
    const updatedRecords = await getDatabase()
      .update(schema.recordsTable)
      .set(updatedRecordData)
      .where(eq(schema.recordsTable.recordId, recordId))
      .returning();

    const updatedRecord = updatedRecords[0];

    if (!updatedRecord) {
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        record: updatedRecord,
        message: "Record updated from Discogs successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating from Discogs:", error);
    return NextResponse.json(
      {
        error: "Failed to update from Discogs",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
