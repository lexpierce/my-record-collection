import { asc, desc, inArray, eq, and } from "drizzle-orm";
import { getDatabase, schema } from "@/lib/db/client";
import { errorResponse, getErrorMessage, jsonResponse } from "./_helpers";

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
    console.error("Error fetching records:", error);
    return errorResponse("Failed to fetch records", getErrorMessage(error), 500);
  }
}

export async function POST({ request }: { request: Request }): Promise<Response> {
  try {
    const recordData = await request.json();

    if (!recordData.artistName || !recordData.albumTitle) {
      return jsonResponse(
        {
          error: "Missing required fields",
          message: "artistName and albumTitle are required",
        },
        400,
      );
    }

    const insertedRecords = await getDatabase()
      .insert(schema.recordsTable)
      .values({
        ...recordData,
        updatedAt: new Date(),
      })
      .returning();

    const newRecord = insertedRecords[0];

    return jsonResponse(
      {
        record: newRecord,
        message: "Record added successfully",
      },
      201,
    );
  } catch (error) {
    console.error("Error adding record:", error);
    return errorResponse("Failed to add record", getErrorMessage(error), 500);
  }
}
