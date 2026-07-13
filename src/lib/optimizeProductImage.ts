import { getImage } from "astro:assets";

/**
 * Produces a resized WebP URL for a remote product image via the Cloudflare
 * Images binding (astro.config.mjs enables files.stripe.com as a remote
 * pattern). Falls back to the original URL on any failure — e.g. if the
 * IMAGES binding isn't available in a given deployment — so a product photo
 * never goes missing over an optimization failure.
 */
export async function optimizeProductImage(src: string, width: number): Promise<string> {
  if (!src) return src;

  try {
    const optimized = await getImage({ src, width, format: "webp" });
    return optimized.src;
  } catch (error) {
    console.error(`optimizeProductImage: falling back to original for "${src}":`, error);
    return src;
  }
}
