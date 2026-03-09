import { describe, it, expect } from "vitest";
import { formatPrice } from "../src/lib/format";

describe("formatPrice", () => {
  it("formats cents to dollars", () => {
    expect(formatPrice(14999)).toBe("$149.99");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("$0.00");
  });

  it("formats single digit cents", () => {
    expect(formatPrice(5)).toBe("$0.05");
  });

  it("formats round dollar amounts", () => {
    expect(formatPrice(10000)).toBe("$100.00");
  });
});
