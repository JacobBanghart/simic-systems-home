import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { orderEmailFromSession, orderNumberFor } from "../src/lib/email/fromCheckoutSession";
import { escapeHtml, renderOrderConfirmation, splitProductName } from "../src/lib/email/orderConfirmation";
import { resolveRecipient } from "../src/lib/email/send";

const session = {
  id: "cs_test_a1b2c3d4e5f6",
  created: 1791234000,
  payment_intent: "pi_3TestTestTest2apscn3w",
  customer_details: { email: "ada@example.com", name: "ada lovelace" },
  amount_subtotal: 53001,
  amount_total: 53801,
  total_details: { amount_tax: 0 },
  shipping_cost: { amount_total: 800, shipping_rate: { display_name: "UPS/USPS Ground" } },
  collected_information: {
    shipping_details: {
      name: "Ada Lovelace",
      address: { line1: "1 Analytical Way", line2: null, city: "London", state: "MA", postal_code: "01852", country: "US" },
    },
  },
} as unknown as Stripe.Checkout.Session;

const lineItems = [
  {
    description: "fallback",
    quantity: 1,
    amount_total: 39999,
    price: { product: { name: "Lorwyn Eclipsed - Collector Booster Display - Lorwyn Eclipsed (ECL)", images: ["https://img.example/a.png"] } },
  },
  { description: "Mystery Box", quantity: 2, amount_total: 13002, price: { product: "prod_unexpanded" } },
] as unknown as Stripe.LineItem[];

describe("orderEmailFromSession", () => {
  const data = orderEmailFromSession(session, lineItems, "https://simic.systems")!;

  it("derives a short order number from the PaymentIntent", () => {
    expect(data.orderNumber).toBe("SIM-2APSCN3W");
    expect(orderNumberFor({ id: "cs_live_abcdefgh12345678", payment_intent: null })).toBe("SIM-12345678");
  });

  it("maps totals, shipping label and address", () => {
    expect(data).toMatchObject({
      customerEmail: "ada@example.com",
      subtotalCents: 53001,
      shippingCents: 800,
      shippingLabel: "UPS/USPS Ground",
      totalCents: 53801,
      shippingAddress: { line1: "1 Analytical Way", city: "London", postalCode: "01852" },
    });
  });

  it("uses expanded product names/images and falls back to the line description", () => {
    expect(data.items[0]).toMatchObject({ name: expect.stringContaining("Lorwyn"), imageUrl: "https://img.example/a.png" });
    expect(data.items[1]).toMatchObject({ name: "Mystery Box", quantity: 2, imageUrl: undefined });
  });

  it("returns null without a customer email", () => {
    expect(orderEmailFromSession({ ...session, customer_details: null, customer_email: null } as Stripe.Checkout.Session, lineItems, "x")).toBeNull();
  });
});

describe("renderOrderConfirmation", () => {
  const data = orderEmailFromSession(session, lineItems, "https://simic.systems")!;
  const { subject, html, text } = renderOrderConfirmation(data);

  it("has subject, greeting and totals in both parts", () => {
    expect(subject).toBe("Order confirmed · SIM-2APSCN3W · Simic Systems");
    expect(html).toContain("Thank you, Ada.");
    expect(html).toContain("$538.01");
    expect(text).toContain("Total paid: $538.01");
    expect(text).toContain("1 Analytical Way");
  });

  it("escapes customer-controlled strings", () => {
    const evil = renderOrderConfirmation({ ...data, customerName: "<script>x</script>", shippingAddress: { line1: '"><img src=x>' } });
    expect(evil.html).not.toContain("<script>x");
    expect(evil.html).not.toContain('"><img src=x>');
    expect(escapeHtml(`<a href="x">'`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;");
  });

  it("loads the logo from the hotlink-exempt path", () => {
    expect(html).toContain("https://simic.systems/hotlink-ok/email/logo.png");
  });

  it("splits Stripe product names into title and set", () => {
    expect(splitProductName("Secrets of Strixhaven - Play Booster Display - Secrets of Strixhaven (SOS)")).toEqual({
      title: "Secrets of Strixhaven Play Booster Display",
      subtitle: "Secrets of Strixhaven (SOS)",
    });
  });
});

describe("resolveRecipient", () => {
  it("emails the customer with a live key", () => {
    expect(resolveRecipient({ STRIPE_SECRET_KEY: "sk_live_x", ORDER_EMAIL_DEV_TO: "dev@example.com" }, "buyer@example.com")).toBe("buyer@example.com");
  });

  it("never emails the customer with a test key", () => {
    expect(resolveRecipient({ STRIPE_SECRET_KEY: "sk_test_x", ORDER_EMAIL_DEV_TO: "dev@example.com" }, "buyer@example.com")).toBe("dev@example.com");
    expect(resolveRecipient({ STRIPE_SECRET_KEY: "sk_test_x" }, "buyer@example.com")).toBeNull();
  });
});

describe("dark theme", () => {
  const { html } = renderOrderConfirmation(orderEmailFromSession(session, lineItems, "https://simic.systems")!);

  it("declares both schemes and tags palette colours with classes", () => {
    expect(html).toContain('content="light dark"');
    expect(html).toMatch(/class="[^"]*\bc-text\b/);
    expect(html).toMatch(/class="[^"]*\bb-card\b/);
  });

  it("only applies unscoped dark rules inside the prefers-color-scheme block", () => {
    const style = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));
    const outside = style.replace(/@media \(prefers-color-scheme: dark\) \{[\s\S]*?\.glow\{[^}]*\}\s*\}/, "");
    for (const rule of outside.match(/[^{}\s][^{}]*\{[^}]*!important\}/g) ?? []) {
      if (rule.includes("@media") || rule.includes("max-width") || /^\.(px|h1)\b/.test(rule.trim())) continue;
      expect(rule.trim()).toMatch(/^\[data-og(sc|sb)\]/);
    }
  });
});
