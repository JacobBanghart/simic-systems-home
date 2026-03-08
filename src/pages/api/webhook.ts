import type { APIRoute } from "astro";
import Stripe from "stripe";
import { invalidateProductCache } from "../../lib/stripeProducts";

export const prerender = false;

const productCacheInvalidationEvents = new Set([
  "checkout.session.completed",
  "product.created",
  "product.updated",
  "product.deleted",
  "price.created",
  "price.updated",
  "price.deleted",
]);

export const POST: APIRoute = async ({ request, locals }) => {
  const { env } = (locals as any).runtime;
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      env.STRIPE_WEBHOOK_SECRET,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Webhook signature verification failed", {
      status: 400,
    });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items.data.price.product"],
      });

      const lineItems = fullSession.line_items?.data || [];

      for (const lineItem of lineItems) {
        const price = lineItem.price;
        if (!price || !price.product || typeof price.product === "string")
          continue;

        const product = price.product as Stripe.Product;
        const purchasedQty = lineItem.quantity || 0;
        const currentQty = parseInt(product.metadata.quantity || "0", 10);
        const newQty = Math.max(0, currentQty - purchasedQty);

        await stripe.products.update(product.id, {
          metadata: { quantity: String(newQty) },
        });
      }

      console.log(
        `Sale completed: ${session.id}, amount: ${session.amount_total}`
      );
    } catch (err) {
      console.error("Error processing checkout.session.completed:", err);
    }
  }

  if (productCacheInvalidationEvents.has(event.type)) {
    await invalidateProductCache(env);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
