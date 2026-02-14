import { NextRequest, NextResponse } from "next/server";
import { database, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";

/**
 * API route for individual record operations
 *
 * DELETE: Removes a record from the database by recordId
 *
 * Route parameter:
 * - recordId: The database record ID (UUID) to delete
 *
 * Example usage:
 * DELETE /api/records/[recordId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ recordId: string }> }
) {
  try {
    const { recordId } = await params;

    if (!recordId) {
      return NextResponse.json(
        { error: "recordId is required" },
        { status: 400 }
      );
    }

    // Delete the record from the database
    const deletedRecords = await database
      .delete(schema.recordsTable)
      .where(eq(schema.recordsTable.recordId, recordId))
      .returning();

    const deletedRecord = deletedRecords[0];

    if (!deletedRecord) {
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Record deleted successfully",
        recordId: deletedRecord.recordId,
      },
      { status: 200 }
    );
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
