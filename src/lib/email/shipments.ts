import Stripe from "stripe";
import { retrieveSessionLineItems } from "../stripeProducts";
import { shipmentFor } from "./carriers";
import { orderEmailFromSession } from "./fromCheckoutSession";
import { sendOrderConfirmation } from "./send";
import { alertOwner, dashboardUrl } from "../alerts";

// "Your order shipped" emails, driven by a cron rather than a webhook: adding
// metadata to a payment in the Stripe dashboard edits the PaymentIntent, and
// PaymentIntent metadata changes emit no webhook event at all (verified
// 2026-10-05). So every run scans recent payments for a tracking_number that
// hasn't been emailed yet.
//
// Workflow: on the payment in the Stripe dashboard, add metadata
//   tracking_number = <number>     (required)
//   carrier         = USPS|UPS|FedEx|DHL   (optional; guessed from the number)
// Within one cron interval the customer gets the email, and the payment gets
// shipped_email_tracking = <number> so it isn't sent twice. Changing
// tracking_number later re-sends with the new number.
//
// A KV marker is written the moment the email goes out, before the metadata
// write-back: if that write fails, the next run finishes the bookkeeping
// instead of emailing the customer again. Repeated failures for one payment
// stop after MAX_ATTEMPTS and alert the owner, rather than retrying every 10
// minutes for 60 days.

const LOOKBACK_DAYS = 60;
const MAX_ATTEMPTS = 3;
const KV_TTL_SECONDS = (LOOKBACK_DAYS + 7) * 24 * 60 * 60;
export const SITE_URL = "https://simic.systems";

interface ShipmentEnv {
  STRIPE_SECRET_KEY: string;
  ORDER_EMAIL: SendEmail;
  ORDER_EMAIL_DEV_TO?: string;
  PRODUCT_CACHE: KVNamespace;
}

// A refunded or disputed order shouldn't get "It's on the way" if tracking is
// added to it. A fully refunded PaymentIntent still reads status "succeeded",
// so this checks the charge.
export function isRefundedOrDisputed(pi: Stripe.PaymentIntent): boolean {
  const charge = pi.latest_charge;
  if (!charge || typeof charge === "string") return false;
  return charge.refunded || charge.amount_refunded > 0 || charge.disputed;
}

export function needsShippedEmail(metadata: Stripe.Metadata): string | null {
  const tracking = metadata.tracking_number?.trim();
  if (!tracking) return null;
  return metadata.shipped_email_tracking === tracking ? null : tracking;
}

export async function sendPendingShipmentEmails(env: ShipmentEnv): Promise<number> {
  try {
    return await sendPendingShipmentEmailsUnguarded(env);
  } catch (err) {
    // Listing payments failed outright (bad or rotated key, Stripe outage):
    // nothing ships until it's fixed, so say so instead of only logging.
    console.error("Shipped-email cron failed:", err);
    const failKey = "shipped-email-cron-alerted";
    if (!(await env.PRODUCT_CACHE.get(failKey).catch(() => null))) {
      await alertOwner(env, "Shipped-email cron is failing", [
        `The 10-minute job that sends "your order shipped" emails crashed:`,
        String(err),
        ``,
        `It retries every run; this alert repeats at most every 6 hours.`,
      ]);
      await env.PRODUCT_CACHE.put(failKey, "1", { expirationTtl: 6 * 60 * 60 }).catch(() => {});
    }
    return 0;
  }
}

async function sendPendingShipmentEmailsUnguarded(env: ShipmentEnv): Promise<number> {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const since = Math.floor(Date.now() / 1000) - LOOKBACK_DAYS * 24 * 60 * 60;
  let sent = 0;

  for await (const pi of stripe.paymentIntents.list({
    created: { gte: since },
    limit: 100,
    expand: ["data.latest_charge"],
  })) {
    if (pi.status !== "succeeded") continue;
    const tracking = needsShippedEmail(pi.metadata);
    if (!tracking) continue;

    const sentKey = `shipped-email-sent:${pi.id}:${tracking}`;
    const attemptsKey = `shipped-email-attempts:${pi.id}:${tracking}`;
    const markShipped = (note: string) =>
      stripe.paymentIntents.update(pi.id, {
        metadata: { shipped_email_tracking: tracking, shipped_email_at: note },
      });

    try {
      // Sent on an earlier run whose metadata write-back failed.
      const sentAt = await env.PRODUCT_CACHE.get(sentKey);
      if (sentAt) {
        await markShipped(sentAt);
        continue;
      }

      if (isRefundedOrDisputed(pi)) {
        await markShipped("skipped: order refunded or disputed");
        console.log(`Shipped email skipped for ${pi.id}: refunded or disputed`);
        continue;
      }

      const attempts = Number.parseInt((await env.PRODUCT_CACHE.get(attemptsKey)) ?? "0", 10);
      if (attempts >= MAX_ATTEMPTS) continue; // already alerted; waiting on the owner

      const sessions = await stripe.checkout.sessions.list({ payment_intent: pi.id, limit: 1 });
      const sessionId = sessions.data[0]?.id;
      if (!sessionId) {
        await markShipped("skipped: payment has no checkout session");
        console.warn(`Shipped email: no checkout session for ${pi.id}`);
        continue;
      }
      const { session, lineItems } = await retrieveSessionLineItems(stripe, sessionId);
      const data = orderEmailFromSession(session, lineItems, SITE_URL);
      if (!data) {
        await markShipped("skipped: no customer email on the order");
        continue;
      }
      data.shipment = shipmentFor(tracking, pi.metadata.carrier);

      let messageId: string | null;
      try {
        messageId = await sendOrderConfirmation(env, data);
      } catch (err) {
        const next = attempts + 1;
        await env.PRODUCT_CACHE.put(attemptsKey, String(next), { expirationTtl: KV_TTL_SECONDS });
        console.error(`Shipped email failed for ${pi.id} (attempt ${next}/${MAX_ATTEMPTS}):`, err);
        if (next >= MAX_ATTEMPTS) {
          await alertOwner(env, `Shipped email FAILED for ${data.orderNumber}`, [
            `Gave up after ${MAX_ATTEMPTS} attempts to email ${data.customerEmail} their tracking number (${tracking}).`,
            `Last error: ${String(err)}`,
            ``,
            `To retry, change or re-enter tracking_number on the payment, or email the customer yourself:`,
            dashboardUrl(env, `payments/${pi.id}`),
          ]);
        }
        continue;
      }
      if (!messageId) continue; // test mode without ORDER_EMAIL_DEV_TO: leave unmarked

      const sentNote = new Date().toISOString();
      await env.PRODUCT_CACHE.put(sentKey, sentNote, { expirationTtl: KV_TTL_SECONDS });
      await markShipped(sentNote);
      sent++;
      console.log(`Shipped email sent for ${pi.id} (${data.shipment.carrier} ${tracking}): ${messageId}`);
    } catch (err) {
      // Left unmarked, so the next run retries (without re-sending, if the
      // email itself already went out — see sentKey).
      console.error(`Shipped email bookkeeping failed for ${pi.id}:`, err);
    }
  }
  return sent;
}
