import { describe, it, expect } from "vitest";
import { addItem, removeItem, setItemQuantity, cartTotal, cartCount } from "../src/lib/cart";
import type { CartItem, ProductData } from "../src/types";

const product: ProductData = {
  id: "prod_123",
  name: "Test Product",
  description: "A test",
  category: "magic",
  price: 9999,
  priceId: "price_456",
  quantity: 5,
  image: "https://example.com/img.jpg",
  sortOrder: 1,
};

const product2: ProductData = {
  id: "prod_789",
  name: "Other Product",
  description: "Another one",
  category: "onepiece",
  price: 4999,
  priceId: "price_012",
  quantity: 3,
  image: "https://example.com/img2.jpg",
  sortOrder: 2,
};

const cartItem: CartItem = {
  productId: "prod_123",
  priceId: "price_456",
  name: "Test Product",
  price: 9999,
  image: "https://example.com/img.jpg",
  quantity: 2,
};

const cartItem2: CartItem = {
  productId: "prod_789",
  priceId: "price_012",
  name: "Other Product",
  price: 4999,
  image: "https://example.com/img2.jpg",
  quantity: 1,
};

describe("addItem", () => {
  it("adds a new product to an empty cart", () => {
    const result = addItem([], product);
    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe("prod_123");
    expect(result[0].quantity).toBe(1);
  });

  it("increments quantity of existing item", () => {
    const result = addItem([cartItem], product);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(3);
  });

  it("does not exceed product stock", () => {
    const atLimit = { ...cartItem, quantity: 5 };
    const cart = [atLimit];
    const result = addItem(cart, product);
    expect(result).toBe(cart); // same reference, no change
    expect(result[0].quantity).toBe(5);
  });

  it("does not mutate existing cart array", () => {
    const cart = [cartItem];
    const result = addItem(cart, product2);
    expect(result).not.toBe(cart);
    expect(cart).toHaveLength(1);
    expect(result).toHaveLength(2);
  });
});

describe("removeItem", () => {
  it("decrements quantity when > 1", () => {
    const result = removeItem([cartItem], "prod_123");
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(1);
  });

  it("removes item when quantity is 1", () => {
    const singleItem = { ...cartItem, quantity: 1 };
    const result = removeItem([singleItem], "prod_123");
    expect(result).toHaveLength(0);
  });

  it("returns same cart when product not found", () => {
    const cart = [cartItem];
    const result = removeItem(cart, "prod_nonexistent");
    expect(result).toBe(cart);
  });

  it("only affects the targeted item", () => {
    const cart = [cartItem, cartItem2];
    const result = removeItem(cart, "prod_123");
    expect(result).toHaveLength(2);
    expect(result.find((i) => i.productId === "prod_123")?.quantity).toBe(1);
    expect(result.find((i) => i.productId === "prod_789")?.quantity).toBe(1);
  });
});

describe("setItemQuantity", () => {
  it("sets quantity to a specific value", () => {
    const result = setItemQuantity([cartItem], "prod_123", 4);
    expect(result[0].quantity).toBe(4);
  });

  it("removes item when quantity set to 0", () => {
    const result = setItemQuantity([cartItem], "prod_123", 0);
    expect(result).toHaveLength(0);
  });

  it("removes item when quantity set to negative", () => {
    const result = setItemQuantity([cartItem], "prod_123", -1);
    expect(result).toHaveLength(0);
  });
});

describe("cartTotal", () => {
  it("returns 0 for empty cart", () => {
    expect(cartTotal([])).toBe(0);
  });

  it("calculates total for single item", () => {
    expect(cartTotal([cartItem])).toBe(9999 * 2);
  });

  it("calculates total for multiple items", () => {
    expect(cartTotal([cartItem, cartItem2])).toBe(9999 * 2 + 4999 * 1);
  });
});

describe("cartCount", () => {
  it("returns 0 for empty cart", () => {
    expect(cartCount([])).toBe(0);
  });

  it("sums quantities across items", () => {
    expect(cartCount([cartItem, cartItem2])).toBe(3);
  });
});
