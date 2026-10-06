import Stripe from "stripe";
import { retrieveSessionLineItems } from "../stripeProducts";
import { shipmentFor } from "./carriers";
import { orderEmailFromSession } from "./fromCheckoutSession";
import { sendOrderConfirmation } from "./send";

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

const LOOKBACK_DAYS = 60;
export const SITE_URL = "https://simic.systems";

interface ShipmentEnv {
  STRIPE_SECRET_KEY: string;
  ORDER_EMAIL: SendEmail;
  ORDER_EMAIL_DEV_TO?: string;
}

export function needsShippedEmail(metadata: Stripe.Metadata): string | null {
  const tracking = metadata.tracking_number?.trim();
  if (!tracking) return null;
  return metadata.shipped_email_tracking === tracking ? null : tracking;
}

export async function sendPendingShipmentEmails(env: ShipmentEnv): Promise<number> {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const since = Math.floor(Date.now() / 1000) - LOOKBACK_DAYS * 24 * 60 * 60;
  let sent = 0;

  for await (const pi of stripe.paymentIntents.list({ created: { gte: since }, limit: 100 })) {
    if (pi.status !== "succeeded") continue;
    const tracking = needsShippedEmail(pi.metadata);
    if (!tracking) continue;

    try {
      const sessions = await stripe.checkout.sessions.list({ payment_intent: pi.id, limit: 1 });
      const sessionId = sessions.data[0]?.id;
      if (!sessionId) {
        console.warn(`Shipped email: no checkout session for ${pi.id}`);
        continue;
      }
      const { session, lineItems } = await retrieveSessionLineItems(stripe, sessionId);
      const data = orderEmailFromSession(session, lineItems, SITE_URL);
      if (!data) continue;
      data.shipment = shipmentFor(tracking, pi.metadata.carrier);

      const messageId = await sendOrderConfirmation(env, data);
      if (!messageId) continue; // test mode without ORDER_EMAIL_DEV_TO: leave unmarked

      await stripe.paymentIntents.update(pi.id, {
        metadata: { shipped_email_tracking: tracking, shipped_email_at: new Date().toISOString() },
      });
      sent++;
      console.log(`Shipped email sent for ${pi.id} (${data.shipment.carrier} ${tracking}): ${messageId}`);
    } catch (err) {
      // Left unmarked, so the next run retries.
      console.error(`Shipped email failed for ${pi.id}:`, err);
    }
  }
  return sent;
}
