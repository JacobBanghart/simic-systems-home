import { describe, it, expect, vi } from "vitest";
import { mapStripeProduct, parseInteger, adjustProductStock } from "../src/lib/stripeProducts";
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

// adjustProductStock backs the checkout reservation/rollback flow and the
// refund/expired-session release handlers — this is the logic that prevents
// overselling, so it's tested even though it needs a Stripe instance, via a
// stubbed one (the function takes Stripe as a parameter for exactly this).
function fakeStripeForStock(currentQuantity: string | undefined) {
  const retrieve = vi.fn().mockResolvedValue({
    id: "prod_test",
    metadata: currentQuantity === undefined ? {} : { quantity: currentQuantity },
  });
  const update = vi.fn().mockResolvedValue({});
  const stripe = { products: { retrieve, update } } as unknown as Stripe;
  return { stripe, retrieve, update };
}

describe("adjustProductStock", () => {
  it("increments stock by a positive delta", async () => {
    const { stripe, update } = fakeStripeForStock("5");
    await adjustProductStock(stripe, "prod_test", 3);
    expect(update).toHaveBeenCalledWith("prod_test", { metadata: { quantity: "8" } });
  });

  it("decrements stock by a negative delta", async () => {
    const { stripe, update } = fakeStripeForStock("5");
    await adjustProductStock(stripe, "prod_test", -2);
    expect(update).toHaveBeenCalledWith("prod_test", { metadata: { quantity: "3" } });
  });

  it("floors at 0 rather than going negative", async () => {
    const { stripe, update } = fakeStripeForStock("2");
    await adjustProductStock(stripe, "prod_test", -5);
    expect(update).toHaveBeenCalledWith("prod_test", { metadata: { quantity: "0" } });
  });

  it("treats missing quantity metadata as 0", async () => {
    const { stripe, update } = fakeStripeForStock(undefined);
    await adjustProductStock(stripe, "prod_test", 4);
    expect(update).toHaveBeenCalledWith("prod_test", { metadata: { quantity: "4" } });
  });

  it("treats non-numeric quantity metadata as 0", async () => {
    const { stripe, update } = fakeStripeForStock("not-a-number");
    await adjustProductStock(stripe, "prod_test", 4);
    expect(update).toHaveBeenCalledWith("prod_test", { metadata: { quantity: "4" } });
  });

  it("re-reads live stock rather than trusting a caller-supplied value", async () => {
    const { stripe, retrieve } = fakeStripeForStock("5");
    await adjustProductStock(stripe, "prod_test", -1);
    expect(retrieve).toHaveBeenCalledWith("prod_test");
  });
});
