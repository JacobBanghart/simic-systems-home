import { describe, it, expect } from "vitest";

import { isValidCartItem } from "../src/lib/cart";
import type { CartItem } from "../src/types";

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
