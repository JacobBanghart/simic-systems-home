import type { APIRoute } from "astro";
import Stripe from "stripe";
import { env } from "cloudflare:workers";
import { invalidateProductCache } from "../../lib/stripeProducts";
import { getPostHogServer } from "../../lib/posthog-server";

const INDEXNOW_KEY = "simic2026seo9x7y5z3w";
const SITE = "https://simic.systems";

async function pingIndexNow(urls: string[]): Promise<void> {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      host: "simic.systems",
      key: INDEXNOW_KEY,
      keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
      urlList: urls,
    }),
  });
  // fetch() only rejects on network failure, not on HTTP error status —
  // without this check, a bad key or malformed payload fails silently.
  if (!res.ok) {
    console.error(`IndexNow ping rejected: ${res.status} ${await res.text()}`);
  } else {
    console.log(`IndexNow ping accepted for ${urls.length} URL(s): ${urls.join(", ")}`);
  }
}

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
        if (!price || !price.product || typeof price.product === "string") continue;

        const product = price.product as Stripe.Product;
        const purchasedQty = lineItem.quantity || 0;
        const currentQty = parseInt(product.metadata.quantity || "0", 10);
        const newQty = Math.max(0, currentQty - purchasedQty);

        await stripe.products.update(product.id, {
          metadata: { quantity: String(newQty) },
        });
      }

      const posthog = getPostHogServer();
      posthog.capture({
        distinctId: `stripe-session-${session.id}`,
        event: "checkout_completed",
        properties: {
          stripe_session_id: session.id,
          amount_total_cents: session.amount_total,
          currency: session.currency,
          item_count: lineItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
          source: "webhook",
        },
      });
      locals.cfContext.waitUntil(posthog.flush());

      console.log(`Sale completed: ${session.id}, amount: ${session.amount_total}`);
    } catch (err) {
      console.error("Error processing checkout.session.completed:", err);
      return new Response(JSON.stringify({ error: "Inventory update failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (productCacheInvalidationEvents.has(event.type)) {
    await invalidateProductCache(env);

    const urls = [`${SITE}/`];
    if (event.type === "product.created" || event.type === "product.updated") {
      const prod = event.data.object as Stripe.Product;
      if (prod.metadata?.slug) {
        urls.push(`${SITE}/product/${prod.metadata.slug}/`);
      }
    }
    pingIndexNow(urls).catch((err) => console.error("IndexNow ping failed:", err));
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
