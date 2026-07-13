import { getImage } from "astro:assets";

async function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  const res = await fetch(src);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      reject(new Error("Failed to load image to read dimensions"));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

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
    const { height } = await getImageDimensions(src);
    const optimized = await getImage({ src, width, height, format: "webp" });
    return optimized.src;
  } catch (error) {
    console.error(`optimizeProductImage: falling back to original for "${src}":`, error);
    return src;
  }
}
