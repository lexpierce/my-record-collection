import { eq } from "drizzle-orm";
import { getDatabase, schema } from "@/lib/db/client";
import { jsonResponse, serverError } from "../_helpers";

interface EndpointContext {
  request: Request;
  params: { id: string };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET({ params }: EndpointContext): Promise<Response> {
  if (!UUID_PATTERN.test(params.id)) {
    return jsonResponse({ error: "Record not found" }, 404);
  }
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
    return serverError("Failed to fetch record", error);
  }
}

export async function DELETE({ params }: EndpointContext): Promise<Response> {
  if (!UUID_PATTERN.test(params.id)) {
    return jsonResponse({ error: "Record not found" }, 404);
  }
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
    return serverError("Failed to delete record", error);
  }
}
