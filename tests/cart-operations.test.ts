import { describe, it, expect } from "vitest";
import {
  addItem,
  removeItem,
  setItemQuantity,
  cartTotal,
  cartCount,
  normalizeCart,
  toCheckoutItems,
  maxQuantityFor,
  MAX_LINE_QUANTITY,
  MAX_CART_LINES,
} from "../src/lib/cart";
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

describe("setItemQuantity stock and integer caps", () => {
  it("caps at known stock", () => {
    const line = { ...cartItem, quantity: 2, stock: 3 };
    expect(setItemQuantity([line], "prod_123", 9)[0].quantity).toBe(3);
  });

  it("returns same cart when already at stock cap", () => {
    const line = { ...cartItem, quantity: 3, stock: 3 };
    const cart = [line];
    expect(setItemQuantity(cart, "prod_123", 4)).toBe(cart);
  });

  it("caps at the per-line maximum when stock is unknown", () => {
    expect(setItemQuantity([cartItem], "prod_123", 99)[0].quantity).toBe(MAX_LINE_QUANTITY);
  });

  it("floors fractional quantities", () => {
    expect(setItemQuantity([cartItem], "prod_123", 3.9)[0].quantity).toBe(3);
  });

  it("ignores NaN and Infinity", () => {
    const cart = [cartItem];
    expect(setItemQuantity(cart, "prod_123", NaN)).toBe(cart);
    expect(setItemQuantity(cart, "prod_123", Infinity)).toBe(cart);
  });

  it("removes the line when stock is known to be 0", () => {
    expect(setItemQuantity([{ ...cartItem, stock: 0 }], "prod_123", 1)).toHaveLength(0);
  });

  it("is a no-op for unknown products", () => {
    const cart = [cartItem];
    expect(setItemQuantity(cart, "nope", 2)).toBe(cart);
  });
});

describe("addItem stock tracking", () => {
  it("records stock on new lines and refreshes it on existing ones", () => {
    const added = addItem([], product);
    expect(added[0].stock).toBe(5);
    const again = addItem(added, { ...product, quantity: 8 });
    expect(again[0].stock).toBe(8);
  });

  it("does not add a sold-out product", () => {
    const cart: CartItem[] = [];
    expect(addItem(cart, { ...product, quantity: 0 })).toBe(cart);
  });

  it("caps at the per-line maximum even with more stock", () => {
    const big = { ...product, quantity: 50 };
    let cart = addItem([], big);
    for (let i = 0; i < 20; i++) cart = addItem(cart, big);
    expect(cart[0].quantity).toBe(MAX_LINE_QUANTITY);
  });
});

describe("maxQuantityFor", () => {
  it("uses min(stock, per-line max)", () => {
    expect(maxQuantityFor({ stock: 3 })).toBe(3);
    expect(maxQuantityFor({ stock: 50 })).toBe(MAX_LINE_QUANTITY);
    expect(maxQuantityFor({})).toBe(MAX_LINE_QUANTITY);
  });
});

describe("normalizeCart", () => {
  it("returns the same array when already clean", () => {
    const cart = [cartItem, cartItem2];
    expect(normalizeCart(cart)).toBe(cart);
  });

  it("merges duplicate product lines and floors quantities", () => {
    const result = normalizeCart([cartItem, { ...cartItem, quantity: 3.5 }]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(5);
  });

  it("drops lines whose floored quantity is below 1", () => {
    expect(normalizeCart([{ ...cartItem, quantity: 0.4 }])).toHaveLength(0);
  });
});

describe("toCheckoutItems", () => {
  it("maps lines to priceId/quantity", () => {
    expect(toCheckoutItems([cartItem, cartItem2])).toEqual([
      { priceId: "price_456", quantity: 2 },
      { priceId: "price_012", quantity: 1 },
    ]);
  });

  it("merges lines sharing a priceId", () => {
    const dup = { ...cartItem2, productId: "prod_other", priceId: "price_456", quantity: 3 };
    expect(toCheckoutItems([cartItem, dup])).toEqual([{ priceId: "price_456", quantity: 5 }]);
  });

  it("sends integers only and clamps to 1..10", () => {
    const out = toCheckoutItems([
      { ...cartItem, quantity: 2.7 },
      { ...cartItem2, quantity: 40 },
      { ...cartItem, priceId: "price_zero", quantity: 0.2 },
      { ...cartItem, priceId: "price_nan", quantity: NaN },
    ]);
    expect(out).toEqual([
      { priceId: "price_456", quantity: 2 },
      { priceId: "price_012", quantity: MAX_LINE_QUANTITY },
    ]);
  });

  it("limits to the max line count", () => {
    const many = Array.from({ length: MAX_CART_LINES + 5 }, (_, i) => ({
      ...cartItem,
      productId: `p${i}`,
      priceId: `price_${i}`,
    }));
    expect(toCheckoutItems(many)).toHaveLength(MAX_CART_LINES);
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
