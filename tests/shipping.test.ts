import { describe, expect, it } from "vitest";
import { shippingRateAppliesTo } from "../src/lib/shipping";

const rate = (metadata: Record<string, string>) => ({ metadata });

describe("shippingRateAppliesTo", () => {
  it("offers an untagged rate for every cart", () => {
    expect(shippingRateAppliesTo(rate({}), 0)).toBe(true);
    expect(shippingRateAppliesTo(rate({}), 1_000_000)).toBe(true);
  });

  it("splits cleanly at the threshold with no gap or overlap", () => {
    const standard = rate({ max_subtotal_cents: "25000" });
    const signature = rate({ min_subtotal_cents: "25000" });
    for (const subtotal of [24999, 25000, 25001]) {
      const offered = [standard, signature].filter((r) => shippingRateAppliesTo(r, subtotal));
      expect(offered).toHaveLength(1);
    }
    expect(shippingRateAppliesTo(standard, 24999)).toBe(true);
    expect(shippingRateAppliesTo(signature, 25000)).toBe(true);
  });

  it("ignores unparseable metadata rather than hiding the rate", () => {
    expect(shippingRateAppliesTo(rate({ min_subtotal_cents: "abc" }), 100)).toBe(true);
  });
});
