import { eq } from "drizzle-orm";
import { getDatabase, schema } from "@/lib/db/client";
import { errorResponse, getErrorMessage, jsonResponse } from "../_helpers";

interface EndpointContext {
  request: Request;
  params: { id: string };
}

export async function GET({ params }: EndpointContext): Promise<Response> {
  try {
    const foundRecords = await getDatabase()
      .select()
      .from(schema.recordsTable)
      .where(eq(schema.recordsTable.recordId, params.id));

    if (foundRecords.length === 0) {
      return jsonResponse({ error: "Record not found" }, 404);
    }

    return jsonResponse({ record: foundRecords[0] });
  } catch (error) {
    console.error("Error fetching record:", error);
    return errorResponse("Failed to fetch record", getErrorMessage(error), 500);
  }
}

export async function PUT({ request, params }: EndpointContext): Promise<Response> {
  try {
    const updateData = await request.json();

    const updatedRecords = await getDatabase()
      .update(schema.recordsTable)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(schema.recordsTable.recordId, params.id))
      .returning();

    if (updatedRecords.length === 0) {
      return jsonResponse({ error: "Record not found" }, 404);
    }

    return jsonResponse({
      record: updatedRecords[0],
      message: "Record updated successfully",
    });
  } catch (error) {
    console.error("Error updating record:", error);
    return errorResponse("Failed to update record", getErrorMessage(error), 500);
  }
}

export async function DELETE({ params }: EndpointContext): Promise<Response> {
  try {
    const deletedRecords = await getDatabase()
      .delete(schema.recordsTable)
      .where(eq(schema.recordsTable.recordId, params.id))
      .returning();

    if (deletedRecords.length === 0) {
      return jsonResponse({ error: "Record not found" }, 404);
    }

    return jsonResponse({
      message: "Record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting record:", error);
    return errorResponse("Failed to delete record", getErrorMessage(error), 500);
  }
}
