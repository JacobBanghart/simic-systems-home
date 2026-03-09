import { describe, it, expect } from "vitest";

// Test the cart validation logic directly (extracted from CartProvider)
import type { CartItem } from "../src/types";

function isValidCartItem(item: unknown): item is CartItem {
  if (typeof item !== "object" || item === null) return false;
  const record = item as Record<string, unknown>;
  return (
    typeof record.productId === "string" &&
    typeof record.priceId === "string" &&
    typeof record.name === "string" &&
    typeof record.price === "number" &&
    typeof record.image === "string" &&
    typeof record.quantity === "number" &&
    record.quantity > 0
  );
}

describe("isValidCartItem", () => {
  const validItem: CartItem = {
    productId: "prod_123",
    priceId: "price_456",
    name: "Test Product",
    price: 9999,
    image: "https://example.com/img.jpg",
    quantity: 2,
  };

  it("accepts a valid cart item", () => {
    expect(isValidCartItem(validItem)).toBe(true);
  });

  it("rejects null", () => {
    expect(isValidCartItem(null)).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(isValidCartItem("string")).toBe(false);
    expect(isValidCartItem(42)).toBe(false);
  });

  it("rejects items with missing fields", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { priceId, ...partial } = validItem;
    expect(isValidCartItem(partial)).toBe(false);
  });

  it("rejects items with wrong types", () => {
    expect(isValidCartItem({ ...validItem, price: "free" })).toBe(false);
  });

  it("rejects items with quantity 0", () => {
    expect(isValidCartItem({ ...validItem, quantity: 0 })).toBe(false);
  });

  it("rejects items with negative quantity", () => {
    expect(isValidCartItem({ ...validItem, quantity: -1 })).toBe(false);
  });
});
