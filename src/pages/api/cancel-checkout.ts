import type { APIRoute } from "astro";
import Stripe from "stripe";
import { env } from "cloudflare:workers";
import { cancelOpenCheckoutSession, isCheckoutSessionId } from "../../lib/checkoutSessions";
import { invalidateProductCache } from "../../lib/stripeProducts";

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// Called by /checkout/cancel with the session id the cart stored when it sent
// the shopper to Stripe: releases that checkout's reserved stock now rather
// than when the session expires. Session ids are unguessable and only known
// to the shopper's browser, so no further auth is needed.
export const POST: APIRoute = async ({ request }) => {
  let sessionId: unknown;
  try {
    ({ sessionId } = (await request.json()) as { sessionId?: unknown });
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }
  if (!isCheckoutSessionId(sessionId)) return json({ error: "Invalid session" }, 400);

  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const cancelled = await cancelOpenCheckoutSession(stripe, sessionId);
    if (cancelled) await invalidateProductCache(env);
    return json({ cancelled });
  } catch (err) {
    console.error(`Failed to cancel checkout session ${sessionId}:`, err);
    return json({ error: "Could not cancel checkout" }, 500);
  }
};
