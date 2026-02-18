import { NextRequest, NextResponse } from "next/server";
import { database, schema } from "@/lib/db/client";

/**
 * API route for managing records in the collection
 *
 * GET: Fetch all records from the database
 * POST: Add a new record to the collection
 */

/**
 * GET handler - Fetches all records from the database
 * Returns records sorted by creation date (oldest first / ascending)
 */
export async function GET() {
  try {
    const allRecords = await database
      .select()
      .from(schema.recordsTable)
      .orderBy(schema.recordsTable.createdAt);

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
    const insertedRecords = await database
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
