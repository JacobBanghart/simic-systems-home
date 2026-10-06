import { describe, expect, it } from "vitest";
import { CheckoutError, parseCheckoutRequest } from "../src/lib/checkoutRequest";

const item = (quantity: unknown, priceId: unknown = "price_ABC123") => ({ priceId, quantity });

describe("parseCheckoutRequest", () => {
  it("accepts a normal cart and passes previousSessionId through", () => {
    expect(parseCheckoutRequest({ items: [item(2)], previousSessionId: "cs_live_abc" })).toEqual({
      items: [{ priceId: "price_ABC123", quantity: 2 }],
      previousSessionId: "cs_live_abc",
    });
  });

  // Each of these used to reach the stock arithmetic and could write "NaN" or
  // a fraction into a product's quantity metadata.
  it.each([
    ["missing", undefined],
    ["fractional", 0.5],
    ["string", "1"],
    ["NaN", Number.NaN],
    ["zero", 0],
    ["negative", -1],
    ["infinite", Number.POSITIVE_INFINITY],
  ])("rejects a %s quantity", (_label, quantity) => {
    expect(() => parseCheckoutRequest({ items: [item(quantity)] })).toThrow(CheckoutError);
  });

  it.each([[null], [42], ["prod_123"], ["price_../../x"]])("rejects priceId %s", (priceId) => {
    expect(() => parseCheckoutRequest({ items: [item(1, priceId)] })).toThrow(CheckoutError);
  });

  it("merges duplicate lines so stock is checked against the total", () => {
    expect(parseCheckoutRequest({ items: [item(3), item(3)] }).items).toEqual([{ priceId: "price_ABC123", quantity: 6 }]);
  });

  it("caps quantity per item, including across merged lines", () => {
    expect(() => parseCheckoutRequest({ items: [item(11)] })).toThrow("Limit 10");
    expect(() => parseCheckoutRequest({ items: [item(6), item(5)] })).toThrow("Limit 10");
  });

  it("rejects empty, oversized and malformed bodies", () => {
    expect(() => parseCheckoutRequest(null)).toThrow("Cart is empty");
    expect(() => parseCheckoutRequest({ items: [] })).toThrow("Cart is empty");
    expect(() => parseCheckoutRequest({ items: "nope" })).toThrow("Cart is empty");
    const many = Array.from({ length: 21 }, (_, i) => item(1, `price_${i}`));
    expect(() => parseCheckoutRequest({ items: many })).toThrow("Too many");
  });

  it("ignores a non-string previousSessionId", () => {
    expect(parseCheckoutRequest({ items: [item(1)], previousSessionId: 7 }).previousSessionId).toBeUndefined();
  });
});
