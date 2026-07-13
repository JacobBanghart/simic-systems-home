import { defineMiddleware } from "astro:middleware";

function buildSecurityHeaders(nonce: string): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy":
      "default-src 'self'; " +
      // 'self' still covers Astro's own bundled/hydration scripts (served
      // same-origin from /_astro/*.js — no nonce needed, and no way to
      // attach one to Astro-generated tags). The nonce covers the small,
      // fixed set of hand-authored inline <script> blocks (see Astro.locals.nonce
      // usage). The explicit hosts cover third-party scripts, including
      // PostHog's array.js, which it inserts dynamically but always from
      // this same pre-listed host.
      `script-src 'self' 'nonce-${nonce}' https://analytics.ahrefs.com https://*.i.posthog.com https://*.cloudflareinsights.com https://www.googletagmanager.com https://*.google-analytics.com; ` +
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

  const response = await next();

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
