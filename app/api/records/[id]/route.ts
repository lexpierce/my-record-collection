import { NextRequest, NextResponse } from "next/server";
import { database, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { createDiscogsClient } from "@/lib/discogs/client";

/**
 * API route for individual record operations
 *
 * GET: Fetch a specific record by ID
 * PUT: Update a record
 * DELETE: Remove a record from the collection
 */

/**
 * GET handler - Fetches a single record by ID
 * @param params.id - The record ID (UUID)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const recordId = (await params).id;

    const foundRecords = await database
      .select()
      .from(schema.recordsTable)
      .where(eq(schema.recordsTable.recordId, recordId));

    if (foundRecords.length === 0) {
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ record: foundRecords[0] });
  } catch (error) {
    console.error("Error fetching record:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch record",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT handler - Updates a record
 * @param params.id - The record ID (UUID)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const recordId = (await params).id;
    const updateData = await request.json();

    const updatedRecords = await database
      .update(schema.recordsTable)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(schema.recordsTable.recordId, recordId))
      .returning();

    if (updatedRecords.length === 0) {
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      record: updatedRecords[0],
      message: "Record updated successfully",
    });
  } catch (error) {
    console.error("Error updating record:", error);
    return NextResponse.json(
      {
        error: "Failed to update record",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler - Removes a record from the collection
 * @param params.id - The record ID (UUID)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const recordId = (await params).id;

    const deletedRecords = await database
      .delete(schema.recordsTable)
      .where(eq(schema.recordsTable.recordId, recordId))
      .returning();

    if (deletedRecords.length === 0) {
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting record:", error);
    return NextResponse.json(
      {
        error: "Failed to delete record",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
