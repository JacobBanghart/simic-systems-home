import { describe, it, expect } from "vitest";
import { mapStripeProduct, parseInteger } from "../src/lib/stripeProducts";
import type Stripe from "stripe";

function fakeStripeProduct(
  overrides: Partial<Stripe.Product> & { default_price?: Partial<Stripe.Price> | string | null } = {}
): Stripe.Product {
  return {
    id: "prod_test123",
    object: "product",
    name: "Test Booster Box",
    description: "A great product",
    active: true,
    images: ["https://img.example.com/product.jpg"],
    metadata: {
      category: "magic",
      quantity: "10",
      sortOrder: "1",
    },
    default_price: {
      id: "price_test456",
      object: "price",
      unit_amount: 14999,
      currency: "usd",
    } as Stripe.Price,
    ...overrides,
  } as Stripe.Product;
}

describe("parseInteger", () => {
  it("parses valid integers", () => {
    expect(parseInteger("42", 0)).toBe(42);
  });

  it("returns fallback for undefined", () => {
    expect(parseInteger(undefined, 99)).toBe(99);
  });

  it("returns fallback for empty string", () => {
    expect(parseInteger("", 5)).toBe(5);
  });

  it("returns fallback for non-numeric string", () => {
    expect(parseInteger("abc", 10)).toBe(10);
  });

  it("parses negative integers", () => {
    expect(parseInteger("-3", 0)).toBe(-3);
  });

  it("truncates floats to integers", () => {
    expect(parseInteger("3.7", 0)).toBe(3);
  });
});

describe("mapStripeProduct", () => {
  it("maps a valid Stripe product to ProductData", () => {
    const result = mapStripeProduct(fakeStripeProduct());
    expect(result).toEqual({
      id: "prod_test123",
      name: "Test Booster Box",
      description: "A great product",
      category: "magic",
      price: 14999,
      priceId: "price_test456",
      quantity: 10,
      image: "https://img.example.com/product.jpg",
      sortOrder: 1,
    });
  });

  it("returns null when default_price is missing", () => {
    expect(mapStripeProduct(fakeStripeProduct({ default_price: null }))).toBeNull();
  });

  it("returns null when default_price is a string ID (not expanded)", () => {
    expect(mapStripeProduct(fakeStripeProduct({ default_price: "price_abc" }))).toBeNull();
  });

  it("defaults category to magic when not set", () => {
    const product = fakeStripeProduct();
    product.metadata = { quantity: "5", sortOrder: "1" };
    const result = mapStripeProduct(product);
    expect(result?.category).toBe("magic");
  });

  it("defaults description to empty string when null", () => {
    const result = mapStripeProduct(fakeStripeProduct({ description: null }));
    expect(result?.description).toBe("");
  });

  it("defaults quantity to 0 when metadata missing", () => {
    const product = fakeStripeProduct();
    product.metadata = {};
    const result = mapStripeProduct(product);
    expect(result?.quantity).toBe(0);
  });

  it("defaults sortOrder to 999 when metadata missing", () => {
    const product = fakeStripeProduct();
    product.metadata = {};
    const result = mapStripeProduct(product);
    expect(result?.sortOrder).toBe(999);
  });

  it("defaults image to empty string when no images", () => {
    const result = mapStripeProduct(fakeStripeProduct({ images: [] }));
    expect(result?.image).toBe("");
  });

  it("falls back to magic for invalid category", () => {
    const product = fakeStripeProduct();
    product.metadata = { ...product.metadata, category: "pokemon" };
    const result = mapStripeProduct(product);
    expect(result?.category).toBe("magic");
  });

  it("accepts valid categories", () => {
    for (const cat of ["magic", "onepiece", "unionarena"]) {
      const product = fakeStripeProduct();
      product.metadata = { ...product.metadata, category: cat };
      expect(mapStripeProduct(product)?.category).toBe(cat);
    }
  });

  it("defaults price to 0 when unit_amount is null", () => {
    const result = mapStripeProduct(
      fakeStripeProduct({
        default_price: { id: "price_x", object: "price", unit_amount: null, currency: "usd" } as Stripe.Price,
      })
    );
    expect(result?.price).toBe(0);
  });
});
