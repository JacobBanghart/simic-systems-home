import { getImage } from "astro:assets";

// v3: bumped to invalidate v2 entries, which had no `quality` param and so
// defaulted to lossless WebP (~160-380KB per product image, ~2.9MB total
// across the homepage grid) — see the quality note below. Bump again if
// the cached URL shape ever changes.
const CACHE_PREFIX = "imgopt:v3:";
// Cloudflare's transform defaults to lossless encoding for WebP/PNG output
// when no quality is given, which is enormous for photographic product
// images. 80 is the standard "visually lossless" web default — cuts these
// from ~160-380KB down to ~20-30KB with no perceptible difference on
// product photography.
const IMAGE_QUALITY = 80;
// Stripe file links embed a content hash, so the same href always resolves
// to the same bytes — the probed dimensions/URL are safe to cache for a
// long time rather than re-probing files.stripe.com on every request.
const CACHE_TTL_SECONDS = 60 * 60 * 24;

/**
 * Routes a remote product image through Astro's image endpoint, which
 * resizes/re-encodes it via the Cloudflare Images binding (astro.config.mjs)
 * and serves it with long-lived Cache-Control headers instead of Stripe's
 * original, full-resolution file.
 * Remote images require dimensions up front to avoid CLS — `inferSize: true`
 * has Astro probe the image's real dimensions server-side (a small ranged
 * fetch reading just the file header, not the whole image) rather than us
 * fetching and decoding the full image via browser-only APIs (`Image`,
 * `URL.createObjectURL`), which don't exist in the Cloudflare Workers
 * runtime. Falls back to the original URL on any failure so a product photo
 * never goes missing over it.
 *
 * That probe is a real network round-trip to files.stripe.com, and it was
 * running fresh on every SSR request for every product image — the direct
 * cause of ~1.3s TTFBs on catalog pages. Passing `cache` (the same KV
 * namespace fetchStoreProducts uses) memoizes the result per src+width so
 * only the first request after a deploy pays for the probe.
 *
 * The `h` Astro computes from that probe is dropped before returning: for
 * at least some WebP files (seen on product photos with real alpha
 * transparency), Astro's header-only dimension probe comes back with an
 * aspect ratio that doesn't match the source, so the height it bakes into
 * the /_image URL doesn't match `width`'s proportional height. Cloudflare
 * then has to pad the shortfall to hit that exact box — and fills the pad
 * with opaque black instead of preserving transparency, showing up as a
 * solid black band across otherwise-transparent product images. Dropping
 * `h` and requesting width-only lets Cloudflare's own transform (which
 * decodes the real image bytes, not just a header probe) scale
 * proportionally with no padding needed.
 */
export async function optimizeProductImage(
  src: string,
  width: number,
  cache?: KVNamespace
): Promise<string> {
  if (!src) return src;

  const cacheKey = `${CACHE_PREFIX}${width}:${src}`;

  if (cache) {
    const cached = await cache.get(cacheKey);
    if (cached) return cached;
  }

  try {
    const optimized = await getImage({ src, width, quality: IMAGE_QUALITY, inferSize: true });
    const url = new URL(optimized.src, "http://internal");
    url.searchParams.delete("h");
    const result = url.pathname + url.search;
    if (cache) {
      await cache.put(cacheKey, result, { expirationTtl: CACHE_TTL_SECONDS });
    }
    return result;
  } catch (error) {
    console.error(`optimizeProductImage: falling back to original for "${src}":`, error);
    return src;
  }
}
