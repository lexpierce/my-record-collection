import { eq } from "drizzle-orm";
import { createDiscogsClient } from "@/lib/discogs/client";
import { getDatabase, schema } from "@/lib/db/client";
import { jsonResponse, serverError } from "../_helpers";

export async function POST({ request }: { request: Request }): Promise<Response> {
  try {
    const requestBody = await request.json();
    const { recordId, discogsId } = requestBody;

    if (!recordId || !discogsId) {
      return jsonResponse({ error: "recordId and discogsId are required" }, 400);
    }

    const releaseId = Number.parseInt(String(discogsId), 10);
    if (!Number.isSafeInteger(releaseId) || releaseId <= 0) {
      return jsonResponse({ error: "discogsId must be a positive integer" }, 400);
    }

    const discogsClient = createDiscogsClient();
    const releaseData = await discogsClient.getRelease(releaseId);

    const artistName = releaseData.artists[0]?.name || "Unknown Artist";
    const labelName = releaseData.labels[0]?.name || null;
    const catalogNumber = releaseData.labels[0]?.catno || null;
    const recordSize = discogsClient.extractRecordSize(releaseData.formats);
    const vinylColor = discogsClient.extractVinylColor(releaseData.formats);
    const isShapedVinyl = discogsClient.isShapedVinyl(releaseData.formats);

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
      recordSize,
      vinylColor,
      isShapedVinyl,
      updatedAt: new Date(),
    };

    const updatedRecords = await getDatabase()
      .update(schema.recordsTable)
      .set(updatedRecordData)
      .where(eq(schema.recordsTable.recordId, recordId))
      .returning();

    const updatedRecord = updatedRecords[0];

    if (!updatedRecord) {
      return jsonResponse({ error: "Record not found" }, 404);
    }

    return jsonResponse({
      record: updatedRecord,
      message: "Record updated from Discogs successfully",
    });
  } catch (error) {
    return serverError("Failed to update from Discogs", error);
  }
}
