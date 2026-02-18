import { NextRequest, NextResponse } from "next/server";
import { asc, desc, inArray, eq, and } from "drizzle-orm";
import { getDatabase, schema } from "@/lib/db/client";

/**
 * API route for managing records in the collection
 *
 * GET: Fetch all records from the database
 * POST: Add a new record to the collection
 */

/**
 * GET handler - Fetches all records from the database.
 *
 * Optional query parameters:
 *   sortBy   = "artist" | "title" | "year" | "createdAt" (default: "createdAt")
 *   sortDir  = "asc" | "desc"                            (default: "desc" for createdAt/year, "asc" otherwise)
 *   size     = e.g. "12\"" — may be repeated for multiple values
 *   shaped   = "true" | "false"
 *
 * Without params the response is identical to the previous behaviour
 * (all records, newest-first).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // --- sort ---
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
      artist:    recordsTable.artistName,
      title:     recordsTable.albumTitle,
      year:      recordsTable.yearReleased,
      createdAt: recordsTable.createdAt,
    }[sortBy];

    const orderBy = sortDir === "asc" ? asc(orderByCol) : desc(orderByCol);

    // --- filters ---
    const sizeValues = searchParams.getAll("size");
    const shapedParam = searchParams.get("shaped");

    let query = getDatabase()
      .select()
      .from(recordsTable)
      .$dynamic();

    // Apply size and shaped filters if provided
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

    return NextResponse.json({
      records: allRecords,
      count: allRecords.length,
    });
  } catch (error) {
    console.error("Error fetching records:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch records",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Adds a new record to the collection
 * Accepts record data in the request body
 *
 * Request body should match the NewRecord type from the schema
 */
export async function POST(request: NextRequest) {
  try {
    const recordData = await request.json();

    // Validate required fields
    if (!recordData.artistName || !recordData.albumTitle) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          message: "artistName and albumTitle are required",
        },
        { status: 400 }
      );
    }

    // Insert the new record into the database
    const insertedRecords = await getDatabase()
      .insert(schema.recordsTable)
      .values({
        ...recordData,
        updatedAt: new Date(),
      })
      .returning();

    const newRecord = insertedRecords[0];

    return NextResponse.json(
      {
        record: newRecord,
        message: "Record added successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding record:", error);
    return NextResponse.json(
      {
        error: "Failed to add record",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
