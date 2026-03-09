import type { APIRoute } from "astro";
import Stripe from "stripe";

export const prerender = false;

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX = 10; // max checkout attempts per minute per IP

export const POST: APIRoute = async ({ request, locals }) => {
  const { env } = locals.runtime;

  // Rate limiting via KV
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const rateLimitKey = `ratelimit:checkout:${ip}`;
  try {
    const current = parseInt((await env.PRODUCT_CACHE.get(rateLimitKey)) || "0", 10);
    if (current >= RATE_LIMIT_MAX) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again shortly." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
    await env.PRODUCT_CACHE.put(rateLimitKey, String(current + 1), {
      expirationTtl: RATE_LIMIT_WINDOW_SECONDS,
    });
  } catch {
    // If rate limiting fails, allow the request through
  }

  let body: { items: { priceId: string; quantity: number }[] };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return new Response(JSON.stringify({ error: "Cart is empty" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    const origin = new URL(request.url).origin;
    const checkoutItems = await Promise.all(
      body.items.map(async (item) => {
        if (!item.priceId || item.quantity <= 0) {
          throw new Error("Invalid cart item");
        }

        const price = await stripe.prices.retrieve(item.priceId, {
          expand: ["product"],
        });

        if (!price.active) {
          throw new Error("One or more cart items are no longer available");
        }

        if (!price.product || typeof price.product === "string") {
          throw new Error("One or more cart items are no longer available");
        }

        const product = price.product as Stripe.Product;
        const availableQuantity = parseInt(product.metadata.quantity || "0", 10);

        if (item.quantity > availableQuantity) {
          const label = product.name || "This product";
          throw new Error(
            availableQuantity > 0
              ? `${label} only has ${availableQuantity} available`
              : `${label} is out of stock`
          );
        }

        return {
          priceId: price.id,
          quantity: item.quantity,
        };
      })
    );

    const shippingRates = await stripe.shippingRates.list({
      active: true,
      limit: 100,
    });
    const shippingOptions = shippingRates.data.map((shippingRate) => ({
      shipping_rate: shippingRate.id,
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: checkoutItems.map((item) => ({
        price: item.priceId,
        quantity: item.quantity,
      })),
      automatic_tax: {
        enabled: true,
      },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      ...(shippingOptions.length > 0 ? { shipping_options: shippingOptions } : {}),
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to create checkout session:", error);
    const isStripeError = error instanceof Stripe.errors.StripeError;
    const message = isStripeError
      ? error.message
      : error instanceof Error
        ? error.message
        : "Failed to create checkout session";
    const status = isStripeError ? 500 : 400;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
};
