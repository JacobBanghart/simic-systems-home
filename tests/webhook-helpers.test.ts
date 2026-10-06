import { describe, expect, it } from "vitest";
import { isCheckoutSessionId } from "../src/lib/checkoutSessions";
import { alertRecipient } from "../src/lib/alerts";
import { isStockOnlyUpdate } from "../src/lib/stripeProducts";

describe("isCheckoutSessionId", () => {
  it("accepts real-looking session ids only", () => {
    expect(isCheckoutSessionId("cs_live_a1B2c3D4e5F6g7H8")).toBe(true);
    expect(isCheckoutSessionId("cs_test_a1B2c3D4e5F6g7H8")).toBe(true);
    expect(isCheckoutSessionId("</script><h1>x</h1>")).toBe(false);
    expect(isCheckoutSessionId("cs_live_short")).toBe(false);
    expect(isCheckoutSessionId(42)).toBe(false);
    expect(isCheckoutSessionId(null)).toBe(false);
  });
});

describe("alertRecipient", () => {
  it("goes to the shop inbox in live mode and only to the dev address in test mode", () => {
    expect(alertRecipient({ STRIPE_SECRET_KEY: "sk_live_x" })).toBe("contact@simic.systems");
    expect(alertRecipient({ STRIPE_SECRET_KEY: "sk_test_x", ORDER_EMAIL_DEV_TO: "dev@example.com" })).toBe("dev@example.com");
    expect(alertRecipient({ STRIPE_SECRET_KEY: "sk_test_x" })).toBeNull();
  });
});

describe("isStockOnlyUpdate", () => {
  it("is true when only stock (and the updated timestamp) changed", () => {
    expect(isStockOnlyUpdate({ metadata: { quantity: "3" }, updated: 1 })).toBe(true);
    expect(isStockOnlyUpdate({ metadata: { quantity: "3" } })).toBe(true);
  });

  it("is false for real catalog changes or unknown diffs", () => {
    expect(isStockOnlyUpdate({ name: "Old name" })).toBe(false);
    expect(isStockOnlyUpdate({ metadata: { quantity: "3", slug: "old" } })).toBe(false);
    expect(isStockOnlyUpdate({ images: [] , metadata: { quantity: "1" } })).toBe(false);
    expect(isStockOnlyUpdate(undefined)).toBe(false);
  });
});
