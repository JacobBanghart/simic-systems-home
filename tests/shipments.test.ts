import { describe, expect, it } from "vitest";
import { detectCarrier, shipmentFor } from "../src/lib/email/carriers";
import type Stripe from "stripe";
import { isRefundedOrDisputed, needsShippedEmail } from "../src/lib/email/shipments";
import { renderOrderConfirmation, type OrderEmailData } from "../src/lib/email/orderConfirmation";

describe("carriers", () => {
  it("detects carriers from number shape and normalises given names", () => {
    expect(detectCarrier("1Z999AA10123456784")).toBe("UPS");
    expect(detectCarrier("9334911043900000563752")).toBe("USPS");
    expect(detectCarrier("123", "fedex")).toBe("FedEx");
  });

  it("builds a tracking URL and cleans the number", () => {
    expect(shipmentFor(" 9334 9110 4390 0000 5637 52 ", "usps")).toEqual({
      carrier: "USPS",
      trackingNumber: "9334911043900000563752",
      trackingUrl: "https://tools.usps.com/go/TrackConfirmAction?tLabels=9334911043900000563752",
    });
    expect(shipmentFor("1z999aa10123456784").trackingUrl).toBe("https://www.ups.com/track?tracknum=1Z999AA10123456784");
  });
});

describe("needsShippedEmail", () => {
  it("sends once per tracking number", () => {
    expect(needsShippedEmail({})).toBeNull();
    expect(needsShippedEmail({ tracking_number: "940011" })).toBe("940011");
    expect(needsShippedEmail({ tracking_number: "940011", shipped_email_tracking: "940011" })).toBeNull();
    expect(needsShippedEmail({ tracking_number: "940022", shipped_email_tracking: "940011" })).toBe("940022");
  });
});

describe("shipped email variant", () => {
  const base: OrderEmailData = {
    orderNumber: "SIM-TEST1234",
    orderDate: new Date("2026-10-05T12:00:00Z"),
    customerName: "Ada Lovelace",
    customerEmail: "ada@example.com",
    items: [{ name: "Lorwyn Eclipsed - Collector Booster Display - Lorwyn Eclipsed (ECL)", quantity: 1, amountCents: 40450 }],
    subtotalCents: 40450,
    shippingCents: 1500,
    shippingLabel: "Ground Advantage Signature Confirmation",
    taxCents: 0,
    totalCents: 41950,
    siteUrl: "https://simic.systems",
  };

  it("adds a tracking CTA, drops totals, and changes the subject", () => {
    const { subject, html, text } = renderOrderConfirmation({ ...base, shipment: shipmentFor("9334911043900000563752") });
    expect(subject).toBe("Shipped · SIM-TEST1234 · Simic Systems");
    expect(html).toContain("It's on the way, Ada.");
    expect(html).toContain("https://tools.usps.com/go/TrackConfirmAction?tLabels=9334911043900000563752");
    expect(html).not.toContain("Total paid");
    expect(text).toContain("9334911043900000563752");
  });

  it("leaves the confirmation variant unchanged", () => {
    const { subject, html } = renderOrderConfirmation(base);
    expect(subject).toBe("Order confirmed · SIM-TEST1234 · Simic Systems");
    expect(html).toContain("Total paid");
    expect(html).not.toContain("TRACK&nbsp;PACKAGE");
  });
});

describe("carrier detection edge cases", () => {
  it("recognises FedEx numbers instead of calling them USPS", () => {
    expect(detectCarrier("9612019123456789012345")).toBe("FedEx");
    expect(detectCarrier("123456789012")).toBe("FedEx");
  });

  it("accepts carrier names with a service suffix", () => {
    expect(detectCarrier("1Z999AA10123456784", "UPS Ground")).toBe("UPS");
  });

  it("recognises USPS barcodes with the 420+ZIP routing prefix", () => {
    expect(detectCarrier("420018529400111899223334445566")).toBe("USPS");
  });

  it("links unknown carriers to a search, not a USPS page", () => {
    const shipment = shipmentFor("ABC123", "OnTrac");
    expect(shipment.carrier).toBe("OnTrac");
    expect(shipment.trackingUrl).toBe("https://www.google.com/search?q=ABC123");
  });
});

describe("isRefundedOrDisputed", () => {
  const pi = (charge: unknown) => ({ latest_charge: charge }) as unknown as Stripe.PaymentIntent;
  it("skips refunded, partially refunded and disputed orders", () => {
    expect(isRefundedOrDisputed(pi({ refunded: true, amount_refunded: 100, disputed: false }))).toBe(true);
    expect(isRefundedOrDisputed(pi({ refunded: false, amount_refunded: 100, disputed: false }))).toBe(true);
    expect(isRefundedOrDisputed(pi({ refunded: false, amount_refunded: 0, disputed: true }))).toBe(true);
    expect(isRefundedOrDisputed(pi({ refunded: false, amount_refunded: 0, disputed: false }))).toBe(false);
    expect(isRefundedOrDisputed(pi("ch_unexpanded"))).toBe(false);
  });
});
