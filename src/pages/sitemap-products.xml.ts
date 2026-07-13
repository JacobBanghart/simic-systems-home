import type { APIRoute } from "astro";
import { fetchStoreProducts } from "../lib/stripeProducts";
import { env } from "cloudflare:workers";
import type { ProductData } from "../types";

export const prerender = false;

const FALLBACK_LASTMOD = new Date().toISOString().split("T")[0];

export const GET: APIRoute = async ({ site }) => {
  const baseUrl = site ? site.href.replace(/\/$/, "") : "https://simic.systems";

  let products: ProductData[] = [];
  try {
    products = await fetchStoreProducts(env);
  } catch (error) {
    console.error("Failed to fetch products for sitemap:", error);
  }

  // Category pages (/collector-boosters/, /play-boosters/) are routed Astro
  // pages already picked up by @astrojs/sitemap into sitemap-0.xml — don't
  // duplicate them here.
  const urls = products
    .filter((product) => !product.noindex)
    .map((product) => {
      const path = product.slug ?? product.id;
      // Stripe's `updated` is Unix seconds; falls back to today only if missing.
      const lastmod = product.updated
        ? new Date(product.updated * 1000).toISOString().split("T")[0]
        : FALLBACK_LASTMOD;
      return `
  <url>
    <loc>${baseUrl}/product/${path}/</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
