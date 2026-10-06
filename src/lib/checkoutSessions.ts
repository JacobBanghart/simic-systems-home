import type Stripe from "stripe";
import { restoreLineItemStock, retrieveSessionLineItems } from "./stripeProducts";

// Set on a Checkout session whose reserved stock was released here, by the
// shop itself, rather than by the checkout.session.expired webhook — the
// webhook skips sessions carrying it so stock isn't released twice.
export const STOCK_RELEASED_METADATA_KEY = "stock_released";

export function isCheckoutSessionId(value: unknown): value is string {
  return typeof value === "string" && /^cs_(live|test)_[A-Za-z0-9]{10,200}$/.test(value);
}

// Cancels a shopper's own abandoned Checkout session (they backed out of
// Stripe, or started a new checkout) and releases its reserved stock right
// away instead of after the 35-minute expiry. Returns true if stock was
// released. Safe to call with any id: unknown, completed or already-expired
// sessions are left alone.
//
// Order matters: the session is flagged *before* it's expired, so the
// checkout.session.expired event it triggers already carries the flag and the
// webhook leaves the release to us.
export async function cancelOpenCheckoutSession(stripe: Stripe, sessionId: string): Promise<boolean> {
  if (!isCheckoutSessionId(sessionId)) return false;

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return false;
  }
  if (session.status !== "open") return false;

  await stripe.checkout.sessions.update(sessionId, {
    metadata: { ...session.metadata, [STOCK_RELEASED_METADATA_KEY]: "1" },
  });

  try {
    await stripe.checkout.sessions.expire(sessionId);
  } catch (err) {
    // It stopped being open in between. If it expired on its own, its expired
    // event carries our flag, so the release is still ours to do; if it was
    // paid, there is nothing to release.
    const latest = await stripe.checkout.sessions.retrieve(sessionId);
    if (latest.status !== "expired") return false;
    console.warn(`Session ${sessionId} expired on its own while being cancelled:`, err);
  }

  const { lineItems } = await retrieveSessionLineItems(stripe, sessionId);
  await restoreLineItemStock(stripe, lineItems);
  return true;
}
