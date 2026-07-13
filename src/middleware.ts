import { defineMiddleware } from "astro:middleware";
import { getPostHogServer } from "./lib/posthog-server";

function buildSecurityHeaders(nonce: string): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy":
      "default-src 'self'; " +
      // The nonce covers hand-authored inline <script> blocks (see
      // Astro.locals.nonce usage). The two sha256 hashes are Astro's own
      // framework-injected scripts for client:load hydration (the
      // client-directive dispatcher + the astro-island custom element
      // runtime) — they're inline, static, version-locked files that never
      // carry our per-request nonce, so they're allowlisted by hash
      // instead. They only change if Astro itself is upgraded; a CSP
      // violation for an inline script on a client:load page after an
      // Astro upgrade means these need recomputing. The explicit hosts
      // cover third-party scripts, including PostHog's array.js, which it
      // inserts dynamically but always from this same pre-listed host.
      `script-src 'self' 'nonce-${nonce}' 'sha256-QzWFZi+FLIx23tnm9SBU4aEgx4x8DsuASP07mfqol/c=' 'sha256-SaCkFfPruIdTXT8/97JArQmGxiJAL2o4bBDvSgJ5y3Q=' https://analytics.ahrefs.com https://*.i.posthog.com https://*.cloudflareinsights.com https://www.googletagmanager.com https://*.google-analytics.com; ` +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "img-src 'self' https://files.stripe.com data: blob: https://*.google-analytics.com; " +
      "connect-src 'self' https://analytics.ahrefs.com https://api.stripe.com https://*.i.posthog.com https://*.cloudflareinsights.com https://*.google-analytics.com https://www.googletagmanager.com; " +
      "frame-src https://js.stripe.com https://hooks.stripe.com; " +
      "object-src 'none'; " +
      "base-uri 'self'",
  };
}

// Only pages with no per-request nonce'd <script> belong here — caching a
// response that has a nonce baked into it means every visitor within the
// cache window shares one nonce, which defeats the point of a nonce and
// was very likely the mechanism behind a bug where /about/, /faq/,
// /shipping/, and /contact/ (all of which do use a nonce for JSON-LD
// scripts) got stuck serving an empty cached response for hours.
const CACHEABLE_PATHS = new Set([
  "/privacy/",
  "/terms/",
]);

export const onRequest = defineMiddleware(async (context, next) => {
  const nonce = crypto.randomUUID();
  context.locals.nonce = nonce;

  let response: Response;
  try {
    response = await next();
  } catch (err) {
    // Uncaught exceptions in a page/endpoint (as opposed to errors an API
    // route already catches and turns into a JSON error response) previously
    // had nowhere to go except Cloudflare's generic error page — invisible
    // to us except by manually tailing Workers logs. This is the one place
    // that sees every request, so it's the only place that can catch these.
    console.error(`Unhandled error rendering ${context.url.pathname}:`, err);
    try {
      const posthog = getPostHogServer();
      posthog.capture({
        distinctId: `server-error-${crypto.randomUUID()}`,
        event: "server_error",
        properties: {
          path: context.url.pathname,
          message: err instanceof Error ? err.message : String(err),
        },
      });
      context.locals.cfContext.waitUntil(posthog.flush());
    } catch (captureErr) {
      console.error("Failed to capture server_error to PostHog:", captureErr);
    }

    try {
      response = await context.rewrite("/500");
    } catch (rewriteErr) {
      // Last-resort fallback if even rendering the branded 500 page throws
      // (or re-throws through this same middleware) — guarantees a request
      // never falls through to Cloudflare's raw, unbranded error page.
      console.error("Failed to render /500 fallback page:", rewriteErr);
      response = new Response("Internal Server Error", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      });
    }
  }

  for (const [key, value] of Object.entries(buildSecurityHeaders(nonce))) {
    response.headers.set(key, value);
  }

  if (CACHEABLE_PATHS.has(context.url.pathname)) {
    response.headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  }

  // In workerd dev mode, astro-island component-url gets an absolute filesystem
  // path instead of a /@fs/-prefixed URL that Vite can serve. Fix it in the HTML.
  if (import.meta.env.DEV) {
    const ct = response.headers.get("content-type") ?? "";
    if (ct.includes("text/html")) {
      let html = await response.text();
      html = html.replace(
        /component-url="(\/(?:home|usr|opt|root|var)\/[^"]+)"/g,
        'component-url="/@fs$1"'
      );
      return new Response(html, {
        status: response.status,
        headers: response.headers,
      });
    }
  }

  return response;
});
