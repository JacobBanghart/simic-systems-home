import { getImage } from "astro:assets";

/**
 * Routes a remote product image through Astro's image endpoint so it gets
 * served with long-lived Cache-Control headers instead of Stripe's own
 * (astro.config.mjs runs the 'passthrough' image service, which proxies the
 * original file rather than resizing/re-encoding — no Cloudflare Images
 * binding is provisioned on this account, so no actual transform happens).
 * Remote images require dimensions up front to avoid CLS — `inferSize: true`
 * has Astro probe the image's real dimensions server-side (a small ranged
 * fetch reading just the file header, not the whole image) rather than us
 * fetching and decoding the full image via browser-only APIs (`Image`,
 * `URL.createObjectURL`), which don't exist in the Cloudflare Workers
 * runtime. Falls back to the original URL on any failure so a product photo
 * never goes missing over it.
 */
export async function optimizeProductImage(src: string, width: number): Promise<string> {
  if (!src) return src;

  try {
    const optimized = await getImage({ src, width, inferSize: true });
    return optimized.src;
  } catch (error) {
    console.error(`optimizeProductImage: falling back to original for "${src}":`, error);
    return src;
  }
}
