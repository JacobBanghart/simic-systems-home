import type { APIRoute } from "astro";
import Stripe from "stripe";
import type { ProductData } from "../../types";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const { env } = (locals as any).runtime;

  const cached = await env.PRODUCT_CACHE.get("products", "json") as ProductData[] | null;
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    const stripeProducts = await stripe.products.list({
      active: true,
      expand: ["data.default_price"],
    });

    const products: ProductData[] = stripeProducts.data
      .filter((product) => product.default_price && typeof product.default_price !== "string")
      .map((product) => {
        const price = product.default_price as Stripe.Price;
        return {
          id: product.id,
          name: product.name,
          description: product.description || "",
          category: (product.metadata.category as ProductData["category"]) || "magic",
          price: price.unit_amount || 0,
          priceId: price.id,
          quantity: parseInt(product.metadata.quantity || "0", 10),
          image: product.images[0] || "",
        };
      });

    await env.PRODUCT_CACHE.put("products", JSON.stringify(products), {
      expirationTtl: 300,
    });

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
