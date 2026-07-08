import { defineMiddleware } from "astro:middleware";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://analytics.ahrefs.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "font-src 'self' data:; " +
    "img-src 'self' https://files.stripe.com data: blob:; " +
    "connect-src 'self' https://analytics.ahrefs.com https://api.stripe.com; " +
    "frame-src https://js.stripe.com https://hooks.stripe.com; " +
    "object-src 'none'; " +
    "base-uri 'self'",
};

const CACHEABLE_PATHS = new Set([
  "/about/",
  "/faq/",
  "/privacy/",
  "/terms/",
  "/shipping/",
  "/contact/",
]);

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  if (CACHEABLE_PATHS.has(context.url.pathname)) {
    response.headers.set(
      "Cache-Control",
      "public, max-age=3600, stale-while-revalidate=86400"
    );
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
