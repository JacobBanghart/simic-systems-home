/**
 * Place a realistic, fully paid order in the Stripe SANDBOX, using the real
 * (Terraform-mirrored) sandbox catalog — products are looked up by the same
 * lookup_key the storefront uses, and shipping is chosen with the same
 * min/max_subtotal_cents tiers as checkout.
 *
 *   mise run sandbox:order                                  # default cart
 *   mise run sandbox:order -- <lookup_key>[:qty] ...         # custom cart
 *   mise run sandbox:order -- --ship 9400111899223334445566  # + tracking (shipped email)
 *   mise run sandbox:order -- --list                         # show lookup keys
 *
 * To see the emails, run the Worker locally with a sandbox key and forward
 * webhooks (`stripe listen --forward-to http://127.0.0.1:8787/api/webhook/`);
 * --ship is picked up by the shipped-email cron
 * (curl http://127.0.0.1:8787/cdn-cgi/handler/scheduled — see README).
 *
 * Refuses to run with anything but an sk_test_ key. Completing the payment
 * uses /v1/payment_pages/<session>/confirm — the same internal endpoint the
 * Stripe CLI's `trigger` fixtures use — since Checkout has no server-side
 * "pay" API.
 */
import process from "node:process";
import Stripe from "stripe";
import { shippingRateAppliesTo } from "../src/lib/shipping.ts";

const DEFAULT_CART = [
  "lorwyn-eclipsed-collector-booster-display-lorwyn-eclipsed-ecl:1",
  "secrets-of-strixhaven-play-booster-display-secrets-of-strixhaven-sos:1",
];

const TEST_CUSTOMER = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  address: { line1: "12 Analytical Engine Ave", line2: "Apt 4", city: "Lowell", state: "MA", postal_code: "01852", country: "US" },
};

const key = process.env.STRIPE_SECRET_KEY ?? "";
if (!key.startsWith("sk_test_")) {
  console.error("sandbox:order only runs with a Stripe TEST key (sk_test_...). Use `mise run sandbox:order`.");
  process.exit(1);
}
const stripe = new Stripe(key);

const args = process.argv.slice(2);
if (args.includes("--list")) {
  for await (const price of stripe.prices.list({ active: true, limit: 100, expand: ["data.product"] })) {
    if (price.lookup_key && price.product.active) {
      console.log(`${price.lookup_key}  $${(price.unit_amount / 100).toFixed(2)}`);
    }
  }
  process.exit(0);
}

const shipIdx = args.indexOf("--ship");
const tracking = shipIdx >= 0 ? args[shipIdx + 1] : undefined;
if (shipIdx >= 0 && !tracking) {
  console.error("--ship needs a tracking number");
  process.exit(1);
}
const cartArgs = args.filter((a, i) => !a.startsWith("--") && i !== shipIdx + 1);
const cart = (cartArgs.length ? cartArgs : DEFAULT_CART).map((entry) => {
  const [lookupKey, qty = "1"] = entry.split(":");
  return { lookupKey, quantity: Number.parseInt(qty, 10) || 1 };
});

const prices = await stripe.prices.list({ lookup_keys: cart.map((c) => c.lookupKey), active: true, limit: 10 });
const missing = cart.filter((c) => !prices.data.some((p) => p.lookup_key === c.lookupKey));
if (missing.length) {
  console.error(`No active sandbox price for: ${missing.map((m) => m.lookupKey).join(", ")}. Try --list.`);
  process.exit(1);
}

const lineItems = cart.map((c) => {
  const price = prices.data.find((p) => p.lookup_key === c.lookupKey);
  return { price: price.id, quantity: c.quantity, amount: price.unit_amount * c.quantity };
});
const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);

const rates = (await stripe.shippingRates.list({ active: true, limit: 100 })).data.filter((r) =>
  shippingRateAppliesTo(r, subtotal)
);
if (rates.length !== 1) {
  console.error(`Expected exactly one shipping rate for a $${(subtotal / 100).toFixed(2)} cart, found ${rates.length}.`);
  process.exit(1);
}
const rate = rates[0];
const total = subtotal + rate.fixed_amount.amount;

const session = await stripe.checkout.sessions.create({
  mode: "payment",
  line_items: lineItems.map(({ price, quantity }) => ({ price, quantity })),
  shipping_address_collection: { allowed_countries: ["US"] },
  shipping_options: [{ shipping_rate: rate.id }],
  success_url: "https://simic.systems/checkout/success?session_id={CHECKOUT_SESSION_ID}",
  cancel_url: "https://simic.systems/checkout/cancel",
});

const paymentMethod = await stripe.paymentMethods.create({
  type: "card",
  card: { token: "tok_visa" },
  billing_details: { name: TEST_CUSTOMER.name, email: TEST_CUSTOMER.email, address: TEST_CUSTOMER.address },
});

await stripe.rawRequest("POST", `/v1/payment_pages/${session.id}/confirm`, {
  payment_method: paymentMethod.id,
  expected_amount: total,
  shipping: { name: TEST_CUSTOMER.name, address: TEST_CUSTOMER.address },
});

const paid = await stripe.checkout.sessions.retrieve(session.id);
const pi = typeof paid.payment_intent === "string" ? paid.payment_intent : paid.payment_intent?.id;
console.log(`Sandbox order paid: ${paid.status}/${paid.payment_status}`);
console.log(`  session  ${paid.id}`);
console.log(`  payment  ${pi}  (order SIM-${(pi ?? paid.id).slice(-8).toUpperCase()})`);
console.log(`  total    $${(total / 100).toFixed(2)} incl. ${rate.display_name} $${(rate.fixed_amount.amount / 100).toFixed(2)}`);

if (tracking && pi) {
  await stripe.paymentIntents.update(pi, { metadata: { tracking_number: tracking, carrier: "USPS" } });
  console.log(`  tracking ${tracking} added — the shipped-email cron will pick it up`);
}
