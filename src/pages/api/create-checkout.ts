import type { APIRoute } from "astro";
import Stripe from "stripe";
import { env } from "cloudflare:workers";
import { getPostHogServer } from "../../lib/posthog-server";
import { invalidateProductCache, adjustProductStock, InsufficientStockError } from "../../lib/stripeProducts";
import { shippingRateAppliesTo } from "../../lib/shipping";
import { cancelOpenCheckoutSession } from "../../lib/checkoutSessions";
import { CheckoutError, parseCheckoutRequest, type CheckoutRequest } from "../../lib/checkoutRequest";
import { alertOwner } from "../../lib/alerts";

export const prerender = false;

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX = 10; // max checkout attempts per minute per IP

// Checkout sessions default to a 24h expiry, which is also how long stock
// reserved below stays held for an abandoned checkout — 35 minutes keeps
// that window tight while staying safely clear of Stripe's 30-minute
// minimum (a value right at the floor risks rejection from the few hundred
// ms of latency between computing this timestamp and Stripe validating it).
// checkout.session.expired in webhook.ts releases the reservation when a
// session hits this and was never completed.
const CHECKOUT_SESSION_TTL_SECONDS = 35 * 60;

// Best-effort compensation for a reservation already applied when a later
// step in the same request fails (e.g. a second cart item is out of stock,
// or session creation itself errors). Rollbacks are rare — only triggered by
// a failure mid-request — so a failed rollback here is logged, not retried.
async function restoreReservation(stripe: Stripe, productId: string, delta: number): Promise<void> {
  try {
    await adjustProductStock(stripe, productId, delta);
  } catch (err) {
    console.error(
      `Failed to restore ${delta} unit(s) of stock for product ${productId} after a checkout rollback — inventory is understated until this is fixed manually:`,
      err
    );
    await alertOwner(env, "Stock rollback failed — fix by hand", [
      `A checkout failed after reserving stock, and putting the stock back failed too.`,
      ``,
      `Product: ${productId}`,
      `Add back: ${delta} unit(s) to its "quantity" metadata in the Stripe dashboard.`,
      ``,
      `Error: ${String(err)}`,
    ]);
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  // Rate limiting via KV. This is best-effort, not a hard guarantee: KV has
  // no compare-and-swap, so the get-then-put below isn't atomic — a burst of
  // near-simultaneous requests from the same IP can all read the same stale
  // count and all pass, briefly exceeding RATE_LIMIT_MAX. Acceptable here
  // since this is defense-in-depth against casual abuse, not the primary
  // safeguard (that's the per-item stock check below); a hard guarantee
  // would need a Durable Object or Cloudflare's native Rate Limiting binding.
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

  let request_: CheckoutRequest;
  try {
    request_ = parseCheckoutRequest(await request.json());
  } catch (err) {
    const message = err instanceof CheckoutError ? err.message : "Invalid request body";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    // The shopper's own earlier checkout (they backed out of Stripe and came
    // back) is still holding stock until it expires; release it first, or the
    // last unit of something looks unavailable to the very person holding it.
    if (request_.previousSessionId) {
      try {
        await cancelOpenCheckoutSession(stripe, request_.previousSessionId);
      } catch (err) {
        console.warn(`Could not cancel previous checkout ${request_.previousSessionId}:`, err);
      }
    }

    const origin = new URL(request.url).origin;
    const checkoutItems = await Promise.all(
      request_.items.map(async (item) => {
        const price = await stripe.prices.retrieve(item.priceId, {
          expand: ["product"],
        });

        if (!price.active || !price.product || typeof price.product === "string") {
          throw new CheckoutError("One or more cart items are no longer available");
        }

        const product = price.product as Stripe.Product;
        // Archiving a product in the dashboard leaves its prices active.
        if (!product.active || ("deleted" in product && product.deleted)) {
          throw new CheckoutError("One or more cart items are no longer available");
        }
        const availableQuantity = parseInt(product.metadata.quantity || "0", 10);

        if (item.quantity > availableQuantity) {
          // A 0 here can just as easily mean someone else's active
          // (uncompleted) checkout is holding the last unit for up to
          // CHECKOUT_SESSION_TTL_SECONDS, not that it's genuinely gone, so
          // the message hedges (see InsufficientStockError).
          throw new InsufficientStockError(product.id, product.name || "This product", Math.max(0, availableQuantity));
        }

        return {
          priceId: price.id,
          quantity: item.quantity,
          unitAmountCents: price.unit_amount ?? 0,
          productId: product.id,
        };
      })
    );

    // Reserve stock now rather than only checking it — previously this only
    // validated availability and left the actual decrement to the webhook,
    // which can fire anywhere from seconds to CHECKOUT_SESSION_TTL_SECONDS
    // later. In that window two concurrent checkouts for the last unit of an
    // item could both pass validation and both pay, overselling it. Applied
    // sequentially (not Promise.all) so a mid-loop failure only needs to roll
    // back what's already been applied, not race its own writes. A
    // reservation that would take stock below zero throws, so a unit that
    // sold between the check above and here can't be reserved twice.
    const appliedReservations: { productId: string; delta: number }[] = [];
    try {
      for (const item of checkoutItems) {
        await adjustProductStock(stripe, item.productId, -item.quantity);
        appliedReservations.push({ productId: item.productId, delta: item.quantity });
      }
    } catch (reserveError) {
      await Promise.all(
        appliedReservations.map((r) => restoreReservation(stripe, r.productId, r.delta))
      );
      throw reserveError;
    }

    try {
      const shippingRates = await stripe.shippingRates.list({
        active: true,
        limit: 100,
      });
      const subtotalCents = checkoutItems.reduce(
        (sum, item) => sum + item.unitAmountCents * item.quantity,
        0
      );
      const shippingOptions = shippingRates.data
        .filter((shippingRate) => shippingRateAppliesTo(shippingRate, subtotalCents))
        .map((shippingRate) => ({
          shipping_rate: shippingRate.id,
        }));
      // Never fall through to a checkout with no shipping charge at all.
      if (shippingOptions.length === 0) {
        locals.cfContext.waitUntil(
          alertOwner(env, "Checkout blocked: no shipping rate", [
            `No active Stripe shipping rate matches a $${(subtotalCents / 100).toFixed(2)} cart, so checkout was refused.`,
            `Check terraform/stripe/shipping.tf against Stripe (mise run tf:stripe -- plan).`,
          ])
        );
        throw new Error(`No shipping rate applies to a ${subtotalCents}-cent cart`);
      }

      // Passed through to Stripe as client_reference_id so the webhook can
      // recover it later — the webhook has no access to request headers, and
      // without this, checkout_completed (the actual sale) gets stitched to a
      // distinct_id that never appears anywhere else in the user's PostHog
      // history, breaking funnel attribution for every completed purchase.
      const posthogDistinctId = request.headers.get("X-PostHog-Distinct-Id") || undefined;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: checkoutItems.map((item) => ({
          price: item.priceId,
          quantity: item.quantity,
        })),
        automatic_tax: {
          enabled: true,
        },
        expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_SESSION_TTL_SECONDS,
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout/cancel`,
        shipping_address_collection: {
          allowed_countries: ["US"],
        },
        shipping_options: shippingOptions,
        ...(posthogDistinctId ? { client_reference_id: posthogDistinctId } : {}),
      });

      // The reservation above already moved stock off the publicly-cached
      // count — invalidate now so the storefront reflects it immediately
      // instead of waiting up to PRODUCT_CACHE_TTL_SECONDS for a webhook.
      locals.cfContext.waitUntil(invalidateProductCache(env));

      const sessionId = request.headers.get("X-PostHog-Session-Id") || undefined;
      const distinctId = posthogDistinctId || `anonymous-checkout-${session.id}`;
      const posthog = getPostHogServer();
      posthog.capture({
        distinctId,
        event: "checkout_session_created",
        properties: {
          $session_id: sessionId,
          stripe_session_id: session.id,
          item_count: checkoutItems.reduce((sum, item) => sum + item.quantity, 0),
          cart_value_cents: subtotalCents,
          source: "api",
        },
      });
      locals.cfContext.waitUntil(posthog.flush());

      return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (postReserveError) {
      await Promise.all(
        appliedReservations.map((r) => restoreReservation(stripe, r.productId, r.delta))
      );
      throw postReserveError;
    }
  } catch (error) {
    const expected = error instanceof CheckoutError || error instanceof InsufficientStockError;
    if (!expected) console.error("Failed to create checkout session:", error);
    const message = expected
      ? (error as Error).message
      : "Checkout is temporarily unavailable. Please try again in a few minutes.";
    return new Response(JSON.stringify({ error: message }), {
      status: expected ? 400 : 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
