import { defineMiddleware } from "astro:middleware";
import { applySecurityHeaders, authorizeApiRequest } from "@/lib/http/guard";
import { warnIfBunImageMissing } from "@/lib/runtime";

// Runs once when the SSR server module is first loaded (startup).
warnIfBunImageMissing();

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  const denied = authorizeApiRequest(context.request, url);
  if (denied) {
    applySecurityHeaders(denied.headers, url.pathname);
    return denied;
  }

  const response = await next();
  applySecurityHeaders(response.headers, url.pathname);
  return response;
});
