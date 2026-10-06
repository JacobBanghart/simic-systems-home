import { describe, expect, it } from "vitest";
import { detectCarrier, shipmentFor } from "../src/lib/email/carriers";
import { needsShippedEmail } from "../src/lib/email/shipments";
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
