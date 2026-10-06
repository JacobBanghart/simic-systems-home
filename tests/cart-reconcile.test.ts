import { describe, it, expect } from "vitest";
import { reconcileCart, describeCartChange, type CartLine } from "../src/lib/cart";
import type { ProductData } from "../src/types";

const product: ProductData = {
  id: "prod_1",
  name: "Alpha",
  description: "",
  category: "magic",
  price: 1000,
  priceId: "price_1",
  quantity: 5,
  image: "https://example.com/a.jpg",
  sortOrder: 1,
};
const product2: ProductData = {
  ...product,
  id: "prod_2",
  name: "Beta",
  priceId: "price_2",
  price: 2000,
  image: "https://example.com/b.jpg",
};

const line: CartLine = {
  productId: "prod_1",
  priceId: "price_1",
  name: "Alpha",
  price: 1000,
  image: "https://example.com/a.jpg",
  quantity: 2,
  stock: 5,
};
const line2: CartLine = {
  productId: "prod_2",
  priceId: "price_2",
  name: "Beta",
  price: 2000,
  image: "https://example.com/b.jpg",
  quantity: 1,
  stock: 5,
};

describe("reconcileCart", () => {
  it("returns the same cart and no changes when nothing differs", () => {
    const cart = [line, line2];
    const result = reconcileCart(cart, [product, product2]);
    expect(result.cart).toBe(cart);
    expect(result.changes).toEqual([]);
  });

  it("handles an empty cart", () => {
    const cart: CartLine[] = [];
    expect(reconcileCart(cart, [product])).toEqual({ cart, changes: [] });
  });

  it("removes lines whose product no longer exists", () => {
    const result = reconcileCart([line, line2], [product2]);
    expect(result.cart).toEqual([line2]);
    expect(result.changes).toEqual([{ type: "removed", name: "Alpha" }]);
  });

  it("removes everything when the product list is empty", () => {
    const result = reconcileCart([line, line2], []);
    expect(result.cart).toEqual([]);
    expect(result.changes).toHaveLength(2);
  });

  it("adopts the new priceId and price, reporting the change", () => {
    const result = reconcileCart([line], [{ ...product, priceId: "price_new", price: 1500 }]);
    expect(result.cart[0]).toMatchObject({ priceId: "price_new", price: 1500, quantity: 2 });
    expect(result.changes).toEqual([
      { type: "price_changed", name: "Alpha", oldPrice: 1000, newPrice: 1500 },
    ]);
  });

  it("reports price decreases too", () => {
    const result = reconcileCart([line], [{ ...product, priceId: "price_new", price: 800 }]);
    expect(result.changes).toEqual([
      { type: "price_changed", name: "Alpha", oldPrice: 1000, newPrice: 800 },
    ]);
  });

  it("refreshes a new priceId at the same price without a notice", () => {
    const result = reconcileCart([line], [{ ...product, priceId: "price_new" }]);
    expect(result.cart[0].priceId).toBe("price_new");
    expect(result.changes).toEqual([]);
  });

  it("refreshes name and image silently", () => {
    const result = reconcileCart([line], [{ ...product, name: "Alpha v2", image: "https://example.com/new.jpg" }]);
    expect(result.cart[0]).toMatchObject({ name: "Alpha v2", image: "https://example.com/new.jpg" });
    expect(result.changes).toEqual([]);
  });

  it("caps quantity to stock", () => {
    const result = reconcileCart([{ ...line, quantity: 4 }], [{ ...product, quantity: 2 }]);
    expect(result.cart[0]).toMatchObject({ quantity: 2, stock: 2 });
    expect(result.changes).toEqual([
      { type: "reduced", name: "Alpha", oldQuantity: 4, newQuantity: 2 },
    ]);
  });

  it("caps quantity to the per-line maximum", () => {
    const result = reconcileCart([{ ...line, quantity: 14 }], [{ ...product, quantity: 100 }]);
    expect(result.cart[0].quantity).toBe(10);
    expect(result.changes[0]).toMatchObject({ type: "reduced", newQuantity: 10 });
  });

  it("drops sold-out lines", () => {
    const result = reconcileCart([line, line2], [{ ...product, quantity: 0 }, product2]);
    expect(result.cart).toEqual([line2]);
    expect(result.changes).toEqual([{ type: "sold_out", name: "Alpha" }]);
  });

  it("treats negative stock as sold out", () => {
    const result = reconcileCart([line], [{ ...product, quantity: -1 }]);
    expect(result.cart).toEqual([]);
    expect(result.changes[0].type).toBe("sold_out");
  });

  it("records a stock level on lines saved before stock was tracked", () => {
    const { stock: _stock, ...legacy } = line;
    void _stock;
    const result = reconcileCart([legacy], [product]);
    expect(result.cart[0].stock).toBe(5);
    expect(result.changes).toEqual([]);
  });

  it("reports price change and quantity reduction on the same line", () => {
    const result = reconcileCart(
      [{ ...line, quantity: 4 }],
      [{ ...product, priceId: "price_new", price: 1200, quantity: 3 }]
    );
    expect(result.cart[0]).toMatchObject({ priceId: "price_new", price: 1200, quantity: 3, stock: 3 });
    expect(result.changes.map((c) => c.type)).toEqual(["price_changed", "reduced"]);
  });

  it("does not mutate its inputs", () => {
    const cart = [{ ...line, quantity: 4 }];
    const snapshot = JSON.parse(JSON.stringify(cart));
    reconcileCart(cart, [{ ...product, price: 1, quantity: 1 }]);
    expect(cart).toEqual(snapshot);
  });
});

describe("describeCartChange", () => {
  it("describes each change type", () => {
    expect(describeCartChange({ type: "price_changed", name: "X", oldPrice: 1000, newPrice: 1250 })).toBe(
      "Price updated: X is now $12.50"
    );
    expect(describeCartChange({ type: "sold_out", name: "Z" })).toBe("Z is sold out and was removed");
    expect(describeCartChange({ type: "removed", name: "Y" })).toContain("no longer available");
    expect(describeCartChange({ type: "reduced", name: "W", oldQuantity: 4, newQuantity: 2 })).toContain(
      "Only 2 of W"
    );
  });
});

describe("reconcileCart while the shopper's own checkout may hold the stock", () => {
  it("keeps an item the storefront shows as sold out, but still syncs its price", () => {
    const cart = [
      { productId: "prod_1", priceId: "price_old", name: "Box", price: 1000, image: "", quantity: 1, stock: 1 },
    ];
    const products = [
      { id: "prod_1", priceId: "price_new", name: "Box", price: 1200, image: "", quantity: 0 },
    ] as unknown as ProductData[];
    const { cart: next, changes } = reconcileCart(cart, products, { ignoreStock: true });
    expect(next).toEqual([{ ...cart[0], priceId: "price_new", price: 1200 }]);
    expect(changes.map((c) => c.type)).toEqual(["price_changed"]);
  });
});
