import type { APIRoute } from "astro";
import Stripe from "stripe";
import { env } from "cloudflare:workers";
import {
  invalidateProductCache,
  retrieveSessionLineItems,
  restoreLineItemStock,
  isStockOnlyUpdate,
} from "../../lib/stripeProducts";
import { getPostHogServer } from "../../lib/posthog-server";
import { orderEmailFromSession, orderNumberFor } from "../../lib/email/fromCheckoutSession";
import { sendOrderConfirmation } from "../../lib/email/send";
import { alertOwner, dashboardUrl } from "../../lib/alerts";
import { STOCK_RELEASED_METADATA_KEY } from "../../lib/checkoutSessions";

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

const dollars = (cents: number | null | undefined) => `$${((cents ?? 0) / 100).toFixed(2)}`;

// Customer confirmation + owner "new order" alert for a paid session. Runs
// once per session (KV key), whether it's reached from
// checkout.session.completed (card) or async_payment_succeeded (delayed
// methods). A failed customer email is reported to the owner rather than
// failing the webhook: Stripe's own receipt still reaches the customer, and a
// retry would replay the PostHog capture.
async function sendPaidOrderNotifications(
  session: Stripe.Checkout.Session,
  lineItems: Stripe.LineItem[]
): Promise<void> {
  const emailKey = `order-email-sent:${session.id}`;
  if (await env.PRODUCT_CACHE.get(emailKey)) return;

  const emailData = orderEmailFromSession(session, lineItems, SITE);
  let messageId: string | null = null;
  try {
    messageId = emailData ? await sendOrderConfirmation(env, emailData) : null;
    if (messageId) console.log(`Order confirmation sent for ${session.id}: ${messageId}`);
  } catch (err) {
    console.error(`Order confirmation email failed for ${session.id}:`, err);
    await alertOwner(env, `Order confirmation email FAILED for ${orderNumberFor(session)}`, [
      `The branded confirmation didn't send (Stripe's receipt still went out).`,
      `Customer: ${session.customer_details?.email ?? "unknown"}`,
      `Error: ${String(err)}`,
    ]);
  }
  await env.PRODUCT_CACHE.put(emailKey, messageId ?? "not-sent", { expirationTtl: 30 * 24 * 60 * 60 });

  const address = emailData?.shippingAddress;
  await alertOwner(env, `New order ${orderNumberFor(session)} — ${dollars(session.amount_total)}`, [
    ...lineItems.map((li) => `${li.quantity ?? 1} × ${li.description ?? "Item"}  ${dollars(li.amount_total)}`),
    ``,
    `Shipping: ${emailData?.shippingLabel ?? "?"} (${dollars(session.shipping_cost?.amount_total)})`,
    `Total: ${dollars(session.amount_total)}`,
    ``,
    `Ship to:`,
    ...(address
      ? [address.name, address.line1, address.line2, `${address.city ?? ""}, ${address.state ?? ""} ${address.postalCode ?? ""}`].filter(
          (line): line is string => Boolean(line)
        )
      : ["(no shipping address on the session)"]),
    `Email: ${session.customer_details?.email ?? "?"}`,
    ``,
    `Payment: ${dashboardUrl(env, `payments/${typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? ""}`)}`,
  ]);
}

// Releases a checkout's reserved stock — for sessions that expired or whose
// delayed payment failed. Skips sessions the shop already released itself
// (cancelOpenCheckoutSession flags them before expiring them).
async function releaseSessionStock(stripe: Stripe, session: Stripe.Checkout.Session): Promise<void> {
  if (session.metadata?.[STOCK_RELEASED_METADATA_KEY] === "1") {
    console.log(`Stock for ${session.id} was already released when it was cancelled`);
    return;
  }
  const { lineItems } = await retrieveSessionLineItems(stripe, session.id);
  await restoreLineItemStock(stripe, lineItems, { kv: env.PRODUCT_CACHE, key: `stock-released:${session.id}` });
  await invalidateProductCache(env);
}

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
    // Without this guard, a duplicate delivery double-counts revenue in
    // PostHog. TTL covers Stripe's retry window with margin; keyed on
    // event.id (stable across redeliveries of the same event, unlike
    // session.id which is the underlying resource, not the delivery).
    const idempotencyKey = `webhook-processed:${event.id}`;
    const alreadyProcessed = await env.PRODUCT_CACHE.get(idempotencyKey);
    if (alreadyProcessed) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      // Stock is no longer decremented here — create-checkout.ts reserves it
      // at session creation instead, so by the time a session completes the
      // deduction has already happened. Decrementing again here would
      // double-count it.
      const { session: fullSession, lineItems } = await retrieveSessionLineItems(stripe, session.id);

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

      // Delayed payment methods complete the session before the money arrives
      // (payment_status "unpaid"); those are confirmed on
      // checkout.session.async_payment_succeeded instead.
      if (fullSession.payment_status === "unpaid") {
        console.log(`Checkout ${session.id} completed, awaiting delayed payment`);
      } else {
        await sendPaidOrderNotifications(fullSession, lineItems);
      }

      // Marked only after processing succeeds — if this throws below (or
      // above), Stripe's retry should actually reprocess, not be swallowed
      // as a false "duplicate".
      locals.cfContext.waitUntil(
        env.PRODUCT_CACHE.put(idempotencyKey, "1", { expirationTtl: 7 * 24 * 60 * 60 })
      );

      console.log(`Sale completed: ${session.id}, amount: ${session.amount_total}`);
    } catch (err) {
      console.error("Error processing checkout.session.completed:", err);
      return new Response(JSON.stringify({ error: "Order processing failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (
    event.type === "checkout.session.async_payment_succeeded" ||
    event.type === "checkout.session.async_payment_failed"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const idempotencyKey = `webhook-processed:${event.id}`;
    if (await env.PRODUCT_CACHE.get(idempotencyKey)) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      if (event.type === "checkout.session.async_payment_succeeded") {
        const { session: fullSession, lineItems } = await retrieveSessionLineItems(stripe, session.id);
        await sendPaidOrderNotifications(fullSession, lineItems);
      } else {
        // The order never paid: its reservation goes back to the pool.
        await releaseSessionStock(stripe, session);
        await alertOwner(env, `Delayed payment failed for ${orderNumberFor(session)}`, [
          `The customer's payment didn't clear, so the order is void and its stock was released.`,
          `Customer: ${session.customer_details?.email ?? "unknown"}`,
        ]);
      }
      locals.cfContext.waitUntil(
        env.PRODUCT_CACHE.put(idempotencyKey, "1", { expirationTtl: 7 * 24 * 60 * 60 })
      );
    } catch (err) {
      console.error(`Error processing ${event.type}:`, err);
      return new Response(JSON.stringify({ error: "Delayed payment processing failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Same dedup as checkout.session.completed above — without it, a
    // redelivered expiry event would release the same reserved stock twice.
    const idempotencyKey = `webhook-processed:${event.id}`;
    const alreadyProcessed = await env.PRODUCT_CACHE.get(idempotencyKey);
    if (alreadyProcessed) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      // A session that expires without completing means create-checkout.ts's
      // reservation for it was never claimed by a sale — release it back to
      // the pool, or that stock stays permanently held for a cart that will
      // never check out.
      await releaseSessionStock(stripe, session);

      locals.cfContext.waitUntil(
        env.PRODUCT_CACHE.put(idempotencyKey, "1", { expirationTtl: 7 * 24 * 60 * 60 })
      );

      console.log(`Checkout expired: ${session.id}`);
    } catch (err) {
      console.error("Error processing checkout.session.expired:", err);
      return new Response(JSON.stringify({ error: "Stock release failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;

    // Same dedup as the handlers above — a redelivered refund event would
    // otherwise restore the same stock twice.
    const idempotencyKey = `webhook-processed:${event.id}`;
    const alreadyProcessed = await env.PRODUCT_CACHE.get(idempotencyKey);
    if (alreadyProcessed) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const paymentIntentId =
        typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      const paymentLink = dashboardUrl(env, `payments/${paymentIntentId ?? charge.id}`);

      if (!charge.refunded) {
        // Partial refund: Stripe's refund object doesn't map back to which
        // specific line items were returned, so guessing (e.g. splitting
        // proportionally) risks restoring the wrong quantity.
        console.warn(
          `Partial refund on charge ${charge.id} (amount_refunded: ${charge.amount_refunded}/${charge.amount}) — stock not auto-adjusted, review manually.`
        );
        await alertOwner(env, `Partial refund — check stock`, [
          `Refunded ${dollars(charge.amount_refunded)} of ${dollars(charge.amount)}. Stock was NOT changed.`,
          `If items came back, add them to the product's "quantity" metadata by hand.`,
          paymentLink,
        ]);
      } else if (paymentIntentId) {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        const sessions = await stripe.checkout.sessions.list({
          payment_intent: paymentIntentId,
          limit: 1,
        });
        const session = sessions.data[0];

        if (paymentIntent.metadata?.tracking_number) {
          // It already shipped: refunding a lost package, a dispute or a
          // goodwill refund doesn't put the box back on the shelf. Restocking
          // here would let the site sell stock that doesn't exist.
          await alertOwner(env, `Refund on a SHIPPED order — stock not restored`, [
            `Order ${session ? orderNumberFor(session) : paymentIntentId} was fully refunded after shipping (tracking ${paymentIntent.metadata.tracking_number}).`,
            `Stock was left alone. If the package actually came back to you, add it back to the product's "quantity" metadata.`,
            paymentLink,
          ]);
        } else if (session) {
          const { lineItems } = await retrieveSessionLineItems(stripe, session.id);
          await restoreLineItemStock(stripe, lineItems, { kv: env.PRODUCT_CACHE, key: `stock-restocked:${charge.id}` });
          await invalidateProductCache(env);
          console.log(`Full refund processed, stock restored: charge ${charge.id}, session ${session.id}`);
          await alertOwner(env, `Order ${orderNumberFor(session)} refunded — restocked`, [
            `Full refund of ${dollars(charge.amount_refunded)} on an order that hadn't shipped; its items were put back in stock.`,
            ...lineItems.map((li) => `+${li.quantity ?? 0} ${li.description ?? "item"}`),
            paymentLink,
          ]);
        } else {
          console.warn(
            `Full refund on charge ${charge.id} but no matching checkout session found — stock not auto-adjusted.`
          );
        }
      }

      locals.cfContext.waitUntil(
        env.PRODUCT_CACHE.put(idempotencyKey, "1", { expirationTtl: 7 * 24 * 60 * 60 })
      );
    } catch (err) {
      console.error("Error processing charge.refunded:", err);
      return new Response(JSON.stringify({ error: "Refund reconciliation failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (event.type === "charge.dispute.created") {
    // Disputed funds aren't confirmed lost yet — the merchant may win the
    // dispute, so auto-restoring stock here would be premature and could let
    // a still-disputed item get sold again before the outcome is known.
    // Log only, for manual review.
    const dispute = event.data.object as Stripe.Dispute;
    console.warn(
      `Dispute created on charge ${dispute.charge} — reason: ${dispute.reason}, amount: ${dispute.amount}. Review manually; stock is not auto-adjusted.`
    );
    const dueBy = dispute.evidence_details?.due_by
      ? new Date(dispute.evidence_details.due_by * 1000).toDateString()
      : "see dashboard";
    await alertOwner(env, `DISPUTE opened — ${dollars(dispute.amount)} (${dispute.reason})`, [
      `A customer disputed a charge. Respond before: ${dueBy}.`,
      `Evidence: tracking + delivery confirmation, signature, receipt, all-sales-final policy, packed-box photos.`,
      dashboardUrl(env, `disputes/${dispute.id}`),
    ]);
  }

  if (productCacheInvalidationEvents.has(event.type)) {
    await invalidateProductCache(env);

    const stockOnly =
      event.type === "checkout.session.completed" ||
      (event.type === "product.updated" &&
        isStockOnlyUpdate(event.data.previous_attributes as Record<string, unknown> | undefined));
    if (!stockOnly) {
      const urls = [`${SITE}/`];
      if (event.type === "product.created" || event.type === "product.updated") {
        const prod = event.data.object as Stripe.Product;
        if (prod.metadata?.slug) {
          urls.push(`${SITE}/product/${prod.metadata.slug}/`);
        }
      }
      locals.cfContext.waitUntil(
        pingIndexNow(urls).catch((err) => console.error("IndexNow ping failed:", err))
      );
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
