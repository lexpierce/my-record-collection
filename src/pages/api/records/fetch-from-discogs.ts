import { eq } from "drizzle-orm";
import { createDiscogsClient } from "@/lib/discogs/client";
import { getDatabase, schema } from "@/lib/db/client";
import { errorResponse, getErrorMessage, jsonResponse } from "../_helpers";

export async function POST({ request }: { request: Request }): Promise<Response> {
  try {
    const requestBody = await request.json();
    const releaseId = requestBody.releaseId;

    if (!releaseId) {
      return jsonResponse({ error: "releaseId is required" }, 400);
    }

    const discogsClient = createDiscogsClient();
    const releaseData = await discogsClient.getRelease(releaseId);

    const artistName = releaseData.artists[0]?.name || "Unknown Artist";
    const labelName = releaseData.labels[0]?.name || null;
    const catalogNumber = releaseData.labels[0]?.catno || null;
    const recordSize = discogsClient.extractRecordSize(releaseData.formats);
    const vinylColor = discogsClient.extractVinylColor(releaseData.formats);
    const isShapedVinyl = discogsClient.isShapedVinyl(releaseData.formats);

    const newRecordData = {
      artistName,
      albumTitle: releaseData.title,
      yearReleased: releaseData.year || null,
      labelName,
      catalogNumber,
      discogsId: releaseData.id.toString(),
      discogsUri: releaseData.uri,
      thumbnailUrl: releaseData.thumb,
      coverImageUrl: releaseData.cover_image,
      genres: releaseData.genres || [],
      styles: releaseData.styles || [],
      recordSize,
      vinylColor,
      isShapedVinyl,
      dataSource: "discogs" as const,
      isSyncedWithDiscogs: false,
    };

    const insertedRecords = await getDatabase()
      .insert(schema.recordsTable)
      .values(newRecordData)
      .returning();

    const savedRecord = insertedRecords[0];

    const username = process.env.DISCOGS_USERNAME;
    if (username) {
      try {
        await discogsClient.addToCollection(username, releaseId);
        await getDatabase()
          .update(schema.recordsTable)
          .set({ isSyncedWithDiscogs: true })
          .where(eq(schema.recordsTable.recordId, savedRecord.recordId));
        savedRecord.isSyncedWithDiscogs = true;
      } catch (error) {
        const errorWithStatus = error as Error & { status?: number };
        if (errorWithStatus.status === 409) {
          await getDatabase()
            .update(schema.recordsTable)
            .set({ isSyncedWithDiscogs: true })
            .where(eq(schema.recordsTable.recordId, savedRecord.recordId));
          savedRecord.isSyncedWithDiscogs = true;
        } else {
          console.warn("Failed to add to Discogs collection:", error);
        }
      }
    }

    return jsonResponse(
      {
        record: savedRecord,
        message: "Record fetched from Discogs and saved successfully",
      },
      201,
    );
  } catch (error) {
    console.error("Error fetching from Discogs:", error);
    return errorResponse("Failed to fetch from Discogs", getErrorMessage(error), 500);
  }
}
