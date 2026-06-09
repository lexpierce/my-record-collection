export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function errorResponse(error: string, message: string, status: number): Response {
  return jsonResponse({ error, message }, status);
}

/**
 * Logs the full error server-side and returns a client-safe response.
 *
 * Use for unexpected 5xx failures: the real error (DB messages, stack traces,
 * connection details) is written to the server log only, while the client
 * receives a generic message. This prevents internal information disclosure.
 */
export function serverError(context: string, error: unknown, status = 500): Response {
  console.error(`${context}:`, error);
  return errorResponse(context, "An internal error occurred. Please try again later.", status);
}
