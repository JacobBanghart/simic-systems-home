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

    // Stripe delivers webhooks at-least-once and retries on any non-2xx
    // response or timeout — the same event.id can arrive more than once.
    // Without this guard, a duplicate delivery double-decrements inventory
    // and double-counts revenue in PostHog. TTL covers Stripe's retry window
    // with margin; keyed on event.id (stable across redeliveries of the same
    // event, unlike session.id which is the underlying resource, not the delivery).
    const idempotencyKey = `webhook-processed:${event.id}`;
    const alreadyProcessed = await env.PRODUCT_CACHE.get(idempotencyKey);
    if (alreadyProcessed) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

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

      // client_reference_id carries the browser's PostHog distinct_id, set on
      // session creation in create-checkout.ts — without it, this event (the
      // actual sale) gets a distinct_id that never appears anywhere else in
      // the user's history, so it can't be stitched into the browsing funnel.
      // Falls back to a session-scoped id for older/manual sessions that
      // predate this, or when the client didn't send a PostHog id at all.
      const distinctId = fullSession.client_reference_id || `stripe-session-${session.id}`;
      const posthog = getPostHogServer();
      posthog.capture({
        distinctId,
        event: "checkout_completed",
        properties: {
          stripe_session_id: session.id,
          amount_total_cents: session.amount_total,
          currency: session.currency,
          item_count: lineItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
          source: "webhook",
          identity_linked: Boolean(fullSession.client_reference_id),
        },
      });
      locals.cfContext.waitUntil(posthog.flush());

      // Marked only after processing succeeds — if this throws below (or
      // above), Stripe's retry should actually reprocess, not be swallowed
      // as a false "duplicate".
      locals.cfContext.waitUntil(
        env.PRODUCT_CACHE.put(idempotencyKey, "1", { expirationTtl: 7 * 24 * 60 * 60 })
      );

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
