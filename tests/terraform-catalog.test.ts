import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SIGNATURE_SHIPPING_CENTS,
  SIGNATURE_THRESHOLD_CENTS,
  STANDARD_SHIPPING_CENTS,
} from "../src/lib/shipping";

// Guardrails on the Terraform-managed catalog (terraform/stripe/products.tf),
// replacing the old `catalog:gtin-check` script: a product can't go live
// without a GTIN (Google Merchant / structured data) or a unique URL slug.
// Parses the HCL with regexes, which is enough for the flat generated layout.

const hcl = readFileSync(new URL("../terraform/stripe/products.tf", import.meta.url), "utf8");

const products = [...hcl.matchAll(/resource "stripe_product" "([^"]+)" \{([\s\S]*?)\n\}/g)].map(
  ([, name, body]) => ({
    name,
    active: /^\s*active\s*=\s*true\s*$/m.test(body),
    gtin: body.match(/^\s*gtin\s*=\s*"([^"]*)"/m)?.[1],
    slug: body.match(/^\s*slug\s*=\s*"([^"]*)"/m)?.[1],
    catalogKey: body.match(/^\s*catalogKey\s*=\s*"([^"]*)"/m)?.[1],
  })
);

const prices = [...hcl.matchAll(/resource "stripe_price" "([^"]+)" \{([\s\S]*?)\n\}/g)].map(
  ([, name, body]) => ({ name, lookupKey: body.match(/^\s*lookup_key\s*=\s*"([^"]*)"/m)?.[1] })
);

describe("terraform/stripe catalog", () => {
  it("parses the products", () => {
    expect(products.length).toBeGreaterThan(0);
  });

  it.each(products.filter((p) => p.active).map((p) => [p.name, p]))(
    "%s has a valid GTIN and slug",
    (_name, product) => {
      expect(product.gtin).toMatch(/^(\d{8}|\d{12,14})$/);
      expect(product.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  );

  it("has unique slugs", () => {
    const slugs = products.map((p) => p.slug).filter(Boolean);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every product a price whose lookup_key is its catalogKey", () => {
    for (const product of products) {
      const price = prices.find((p) => p.name === product.name);
      expect(price?.lookupKey, product.name).toBe(product.catalogKey);
    }
  });
});

describe("terraform/stripe catalog keys", () => {
  it("has unique catalogKey values across products", () => {
    const keys = products.map((p) => p.catalogKey).filter(Boolean);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has unique lookup_key values across prices", () => {
    const keys = prices.map((p) => p.lookupKey).filter(Boolean);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every active product's catalogKey a matching price lookup_key", () => {
    const lookupKeys = new Set(prices.map((p) => p.lookupKey));
    for (const product of products.filter((p) => p.active)) {
      expect(product.catalogKey, product.name).toBeTruthy();
      expect(lookupKeys.has(product.catalogKey), product.name).toBe(true);
    }
  });
});

// src/lib/shipping.ts holds display copies of the shipping tiers; Stripe
// (terraform/stripe/shipping.tf) is what actually charges. Keep them equal.
describe("terraform/stripe shipping rates", () => {
  const shippingHcl = readFileSync(new URL("../terraform/stripe/shipping.tf", import.meta.url), "utf8");

  const rateAmount = (name: string): number => {
    const block = shippingHcl.match(
      new RegExp(`resource "stripe_shipping_rate" "${name}" \\{([\\s\\S]*?)\\n\\}`)
    )?.[1];
    expect(block, `stripe_shipping_rate.${name}`).toBeDefined();
    const amount = block!.match(/fixed_amount\s*\{[^}]*?\bamount\s*=\s*(\d+)/)?.[1];
    expect(amount, `${name} fixed_amount.amount`).toBeDefined();
    return Number(amount);
  };

  it("standard rate matches STANDARD_SHIPPING_CENTS", () => {
    expect(rateAmount("standard")).toBe(STANDARD_SHIPPING_CENTS);
  });

  it("signature rate matches SIGNATURE_SHIPPING_CENTS", () => {
    expect(rateAmount("signature")).toBe(SIGNATURE_SHIPPING_CENTS);
  });

  it("signature_threshold_cents matches SIGNATURE_THRESHOLD_CENTS", () => {
    const threshold = shippingHcl.match(/\bsignature_threshold_cents\s*=\s*"?(\d+)"?/)?.[1];
    expect(threshold).toBeDefined();
    expect(Number(threshold)).toBe(SIGNATURE_THRESHOLD_CENTS);
  });
});
