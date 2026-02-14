import { eq, inArray } from "drizzle-orm";
import { database, schema } from "@/lib/db/client";
import {
  createDiscogsClient,
  type DiscogsCollectionBasicInfo,
} from "@/lib/discogs/client";
import type { NewRecord } from "@/lib/db/schema";

export interface SyncProgress {
  phase: "pull" | "push" | "done";
  pulled: number;
  pushed: number;
  skipped: number;
  errors: string[];
  totalDiscogsItems: number;
}

/**
 * Converts a Discogs collection basic_information to a NewRecord for DB insertion
 */
function collectionReleaseToRecord(info: DiscogsCollectionBasicInfo): NewRecord {
  const client = createDiscogsClient();
  return {
    artistName: info.artists[0]?.name || "Unknown Artist",
    albumTitle: info.title,
    yearReleased: info.year || null,
    labelName: info.labels[0]?.name || null,
    catalogNumber: info.labels[0]?.catno || null,
    discogsId: info.id.toString(),
    discogsUri: info.resource_url,
    thumbnailUrl: info.thumb || null,
    coverImageUrl: info.cover_image || null,
    genres: info.genres || [],
    styles: info.styles || [],
    recordSize: client.extractRecordSize(info.formats),
    vinylColor: client.extractVinylColor(info.formats),
    isShapedVinyl: client.isShapedVinyl(info.formats),
    dataSource: "discogs" as const,
    isSyncedWithDiscogs: true,
  };
}

/**
 * Orchestrates two-way sync between local DB and Discogs collection.
 * Pull: Import missing Discogs releases into local DB.
 * Push: Add local Discogs-sourced records to Discogs collection.
 * Never removes entries from either side.
 */
export async function executeSync(
  onProgress: (progress: SyncProgress) => void,
): Promise<SyncProgress> {
  const username = process.env.DISCOGS_USERNAME;
  if (!username) {
    throw new Error("DISCOGS_USERNAME environment variable is required for sync");
  }

  const client = createDiscogsClient();
  const progress: SyncProgress = {
    phase: "pull",
    pulled: 0,
    pushed: 0,
    skipped: 0,
    errors: [],
    totalDiscogsItems: 0,
  };

  // --- PULL phase: Discogs → Local DB ---
  onProgress({ ...progress });

  // Build a Set of existing discogsIds for fast lookup
  const existingRecords = await database
    .select({ discogsId: schema.recordsTable.discogsId })
    .from(schema.recordsTable);
  const existingIds = new Set(
    existingRecords.map((r) => r.discogsId).filter(Boolean),
  );

  // Paginate through Discogs collection
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await client.getUserCollection(username, page, 100);
    totalPages = response.pagination.pages;
    progress.totalDiscogsItems = response.pagination.items;

    for (const release of response.releases) {
      const discogsId = release.basic_information.id.toString();

      if (existingIds.has(discogsId)) {
        progress.skipped++;
        continue;
      }

      try {
        const newRecord = collectionReleaseToRecord(release.basic_information);
        await database.insert(schema.recordsTable).values(newRecord);
        progress.pulled++;
        existingIds.add(discogsId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Skip unique constraint violations (duplicate discogsId)
        if (msg.includes("unique") || msg.includes("duplicate")) {
          progress.skipped++;
        } else {
          progress.errors.push(`Pull ${discogsId}: ${msg}`);
        }
      }
    }

    onProgress({ ...progress });
    page++;
  }

  // Mark all records with a matching discogsId as synced
  const allDiscogsIds = [...existingIds].filter(Boolean) as string[];
  if (allDiscogsIds.length > 0) {
    // Batch update in chunks of 500 to avoid query size limits
    for (let i = 0; i < allDiscogsIds.length; i += 500) {
      const chunk = allDiscogsIds.slice(i, i + 500);
      await database
        .update(schema.recordsTable)
        .set({ isSyncedWithDiscogs: true })
        .where(inArray(schema.recordsTable.discogsId, chunk));
    }
  }

  // --- PUSH phase: Local DB → Discogs ---
  progress.phase = "push";
  onProgress({ ...progress });

  // Find local records with a discogsId that aren't yet synced
  const unsyncedRecords = await database
    .select({
      recordId: schema.recordsTable.recordId,
      discogsId: schema.recordsTable.discogsId,
    })
    .from(schema.recordsTable)
    .where(eq(schema.recordsTable.isSyncedWithDiscogs, false));

  for (const record of unsyncedRecords) {
    if (!record.discogsId) continue;

    try {
      await client.addToCollection(username, parseInt(record.discogsId, 10));
      await database
        .update(schema.recordsTable)
        .set({ isSyncedWithDiscogs: true })
        .where(eq(schema.recordsTable.recordId, record.recordId));
      progress.pushed++;
    } catch (err) {
      const errWithStatus = err as Error & { status?: number };
      // 409 = already in collection — mark as synced
      if (errWithStatus.status === 409) {
        await database
          .update(schema.recordsTable)
          .set({ isSyncedWithDiscogs: true })
          .where(eq(schema.recordsTable.recordId, record.recordId));
        progress.pushed++;
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        progress.errors.push(`Push ${record.discogsId}: ${msg}`);
      }
    }

    onProgress({ ...progress });
  }

  progress.phase = "done";
  onProgress({ ...progress });
  return progress;
}
