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

// Display copy of the tiers above, for pages, structured data and the cart
// estimate. Stripe (terraform/stripe/shipping.tf) is what actually charges;
// tests/terraform-catalog.test.ts keeps these numbers in step with it.
export const SIGNATURE_THRESHOLD_CENTS = 25000;
export const STANDARD_SHIPPING_CENTS = 800;
export const SIGNATURE_SHIPPING_CENTS = 1500;

export function estimatedShippingCents(subtotalCents: number): number {
  return subtotalCents >= SIGNATURE_THRESHOLD_CENTS ? SIGNATURE_SHIPPING_CENTS : STANDARD_SHIPPING_CENTS;
}
