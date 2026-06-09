/**
 * One-way (read-only) sync that caches a user's Discogs collection locally.
 *
 * Pull phase: pages through the Discogs collection and, for each release,
 *   inserts it locally if it doesn't exist yet (identified by discogsId) or
 *   refreshes the cached metadata of the existing local record.
 *
 * This sync never writes to Discogs and never deletes local records.
 * The local database is purely a fast, cached mirror of the collection.
 * Idempotent — safe to run multiple times.
 */

import { eq } from "drizzle-orm";
import { getDatabase, schema } from "@/lib/db/client";
import {
  createDiscogsClient,
  type DiscogsCollectionBasicInfo,
} from "@/lib/discogs/client";
import { getDiscogsUsername } from "@/lib/env";
import type { NewRecord } from "@/lib/db/schema";

export interface SyncProgress {
  phase: "pull" | "done";
  pulled: number;
  updated: number;
  skipped: number;
  errors: string[];
  totalDiscogsItems: number;
}

/**
 * Converts a Discogs collection basic_information to a NewRecord for DB insertion.
 *
 * The caller passes in the shared DiscogsClient so that format-extraction helper
 * methods (extractRecordSize, extractVinylColor, isShapedVinyl) are called on
 * the same instance that manages the rate-limiter — no extra client is created.
 */
function collectionReleaseToRecord(
  info: DiscogsCollectionBasicInfo,
  client: ReturnType<typeof createDiscogsClient>,
): NewRecord {
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
 * Pulls the Discogs collection into the local DB cache.
 * Inserts releases that are new locally and refreshes ones that already exist.
 * Never writes to Discogs and never removes local records.
 */
export async function executeSync(
  onProgress: (progress: SyncProgress) => void,
): Promise<SyncProgress> {
  const username = getDiscogsUsername();

  const client = createDiscogsClient();
  const progress: SyncProgress = {
    phase: "pull",
    pulled: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    totalDiscogsItems: 0,
  };

  onProgress({ ...progress });

  // Build a Set of existing discogsIds for fast lookup
  const existingRecords = await getDatabase()
    .select({ discogsId: schema.recordsTable.discogsId })
    .from(schema.recordsTable);
  const existingIds = new Set(
    existingRecords.map((r) => r.discogsId).filter(Boolean),
  );

  // Paginate through the Discogs collection (Discogs → local cache)
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await client.getUserCollection(username, page, 100);
    totalPages = response.pagination.pages;
    progress.totalDiscogsItems = response.pagination.items;

    for (const release of response.releases) {
      const discogsId = release.basic_information.id.toString();
      const record = collectionReleaseToRecord(release.basic_information, client);

      try {
        if (existingIds.has(discogsId)) {
          // Refresh cached metadata for an already-imported release.
          await getDatabase()
            .update(schema.recordsTable)
            .set({ ...record, updatedAt: new Date() })
            .where(eq(schema.recordsTable.discogsId, discogsId));
          progress.updated++;
        } else {
          await getDatabase().insert(schema.recordsTable).values(record);
          progress.pulled++;
          existingIds.add(discogsId);
        }
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

  progress.phase = "done";
  onProgress({ ...progress });
  return progress;
}
