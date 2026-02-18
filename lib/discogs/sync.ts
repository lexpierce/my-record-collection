/**
 * Two-way sync between the local Postgres database and a user's Discogs collection.
 *
 * Pull phase: pages through the Discogs collection and inserts any releases
 *   that don't yet exist locally (identified by discogsId).
 *
 * Push phase: finds local records not yet flagged as synced and whose
 *   discogsId is NOT in the live Discogs collection, then calls addToCollection.
 *
 * Idempotent — safe to run multiple times; never deletes from either side.
 */

import { eq, inArray } from "drizzle-orm";
import { getDatabase, schema } from "@/lib/db/client";
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
  const existingRecords = await getDatabase()
    .select({ discogsId: schema.recordsTable.discogsId })
    .from(schema.recordsTable);
  const existingIds = new Set(
    existingRecords.map((r) => r.discogsId).filter(Boolean),
  );

  // Paginate through Discogs collection, track which IDs are actually on Discogs
  const discogsCollectionIds = new Set<string>();
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await client.getUserCollection(username, page, 100);
    totalPages = response.pagination.pages;
    progress.totalDiscogsItems = response.pagination.items;

    for (const release of response.releases) {
      const discogsId = release.basic_information.id.toString();
      discogsCollectionIds.add(discogsId);

      if (existingIds.has(discogsId)) {
        progress.skipped++;
        continue;
      }

      try {
        const newRecord = collectionReleaseToRecord(release.basic_information);
        await getDatabase().insert(schema.recordsTable).values(newRecord);
        progress.pulled++;
        existingIds.add(discogsId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
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

  // Only mark records as synced if they actually exist in the Discogs collection
  const idsToMarkSynced = [...discogsCollectionIds];
  for (let i = 0; i < idsToMarkSynced.length; i += 500) {
    const chunk = idsToMarkSynced.slice(i, i + 500);
    await getDatabase()
      .update(schema.recordsTable)
      .set({ isSyncedWithDiscogs: true })
      .where(inArray(schema.recordsTable.discogsId, chunk));
  }

  // --- PUSH phase: Local DB → Discogs ---
  progress.phase = "push";
  onProgress({ ...progress });

  // Find local records with a discogsId NOT already flagged as synced.
  // The pull phase marks everything it finds in Discogs as synced, so this
  // efficiently skips records that were already confirmed present.
  const allLocalRecords = await getDatabase()
    .select({
      recordId: schema.recordsTable.recordId,
      discogsId: schema.recordsTable.discogsId,
      isSyncedWithDiscogs: schema.recordsTable.isSyncedWithDiscogs,
    })
    .from(schema.recordsTable);

  const recordsToPush = allLocalRecords.filter(
    (r) => r.discogsId && !r.isSyncedWithDiscogs && !discogsCollectionIds.has(r.discogsId),
  );

  for (const record of recordsToPush) {
    if (!record.discogsId) continue;

    try {
      await client.addToCollection(username, parseInt(record.discogsId, 10));
      await getDatabase()
        .update(schema.recordsTable)
        .set({ isSyncedWithDiscogs: true })
        .where(eq(schema.recordsTable.recordId, record.recordId));
      progress.pushed++;
    } catch (err) {
      const errWithStatus = err as Error & { status?: number };
      // 409 = already in collection — mark as synced
      if (errWithStatus.status === 409) {
        await getDatabase()
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
