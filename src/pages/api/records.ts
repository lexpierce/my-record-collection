import { asc, desc, inArray, eq, and } from "drizzle-orm";
import { getDatabase, schema } from "@/lib/db/client";
import { jsonResponse, serverError } from "./_helpers";

export async function GET({ request }: { request: Request }): Promise<Response> {
  try {
    const searchParams = new URL(request.url).searchParams;

    const sortByParam = searchParams.get("sortBy") ?? "createdAt";
    const validSortBy = ["artist", "title", "year", "createdAt"] as const;
    type SortBy = (typeof validSortBy)[number];
    const sortBy: SortBy = validSortBy.includes(sortByParam as SortBy)
      ? (sortByParam as SortBy)
      : "createdAt";

    const defaultDir = sortBy === "createdAt" || sortBy === "year" ? "desc" : "asc";
    const sortDirParam = searchParams.get("sortDir") ?? defaultDir;
    const sortDir = sortDirParam === "asc" ? "asc" : "desc";

    const { recordsTable } = schema;
    const orderByCol = {
      artist: recordsTable.artistName,
      title: recordsTable.albumTitle,
      year: recordsTable.yearReleased,
      createdAt: recordsTable.createdAt,
    }[sortBy];

    const orderBy = sortDir === "asc" ? asc(orderByCol) : desc(orderByCol);

    const sizeValues = searchParams.getAll("size");
    const shapedParam = searchParams.get("shaped");

    let query = getDatabase()
      .select()
      .from(recordsTable)
      .$dynamic();

    const conditions = [];
    if (sizeValues.length > 0) {
      conditions.push(inArray(recordsTable.recordSize, sizeValues));
    }
    if (shapedParam === "true") {
      conditions.push(eq(recordsTable.isShapedVinyl, true));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const allRecords = await query.orderBy(orderBy);

    return jsonResponse({
      records: allRecords,
      count: allRecords.length,
    });
  } catch (error) {
    return serverError("Failed to fetch records", error);
  }
}
