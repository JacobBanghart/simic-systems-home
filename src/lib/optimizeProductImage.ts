import { getImage } from "astro:assets";

const CACHE_PREFIX = "imgopt:v1:";
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
    const optimized = await getImage({ src, width, inferSize: true });
    if (cache) {
      await cache.put(cacheKey, optimized.src, { expirationTtl: CACHE_TTL_SECONDS });
    }
    return optimized.src;
  } catch (error) {
    console.error(`optimizeProductImage: falling back to original for "${src}":`, error);
    return src;
  }
}
