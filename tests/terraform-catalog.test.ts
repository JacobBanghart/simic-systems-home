import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

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
