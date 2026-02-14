import { NextResponse } from "next/server";

/**
 * Health check endpoint for monitoring and deployment verification
 * Named "am_i_evil" as requested
 *
 * Returns a 200 OK response if the application is running
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "yes_i_am",
      message: "Application is running",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
