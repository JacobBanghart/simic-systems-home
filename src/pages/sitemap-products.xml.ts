import type { APIRoute } from "astro";
import { fetchStoreProducts } from "../lib/stripeProducts";

export const prerender = false;

export const GET: APIRoute = async ({ locals, site }) => {
  const { env } = locals.runtime;
  const baseUrl = site ? site.href.replace(/\/$/, "") : "https://simic.systems";

  let products = [];
  try {
    products = await fetchStoreProducts(env);
  } catch (error) {
    console.error("Failed to fetch products for sitemap:", error);
  }

  const urls = products
    .map((product) => {
      const path = product.slug ?? product.id;
      return `
  <url>
    <loc>${baseUrl}/product/${path}/</loc>
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
