import type { APIRoute } from "astro";
import { fetchStoreProducts } from "../../lib/stripeProducts";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const { env } = locals.runtime;

  try {
    const products = await fetchStoreProducts(env);

    return new Response(JSON.stringify(products), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to fetch products from Stripe:", error);
    return new Response(JSON.stringify({ error: "Failed to load products" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
