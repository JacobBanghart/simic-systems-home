import type Stripe from "stripe";

// Shipping rates are tiered by cart value via metadata on the Stripe rate
// itself, so thresholds can be retuned in the Dashboard without a deploy:
//   min_subtotal_cents  — offer this rate only when subtotal >= this
//   max_subtotal_cents  — offer this rate only when subtotal <  this
// A rate with neither key is offered for every cart. High-value carts need a
// signature-confirmation rate because the flat $8 rate doesn't cover the
// signature fee, and a "never arrived" chargeback on a $500 order costs far
// more than the extra few dollars.
function parseCents(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function shippingRateAppliesTo(
  rate: Pick<Stripe.ShippingRate, "metadata">,
  subtotalCents: number
): boolean {
  const min = parseCents(rate.metadata?.min_subtotal_cents);
  const max = parseCents(rate.metadata?.max_subtotal_cents);
  if (min !== undefined && subtotalCents < min) return false;
  if (max !== undefined && subtotalCents >= max) return false;
  return true;
}
