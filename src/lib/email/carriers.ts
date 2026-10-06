import type { OrderShipment } from "./orderConfirmation";

const TRACKING_URLS: Record<string, (n: string) => string> = {
  USPS: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
  UPS: (n) => `https://www.ups.com/track?tracknum=${n}`,
  FedEx: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}`,
  DHL: (n) => `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`,
};

// Normalises a hand-typed carrier ("usps", "Fedex", "UPS Ground") or, when
// it's missing, guesses from the number's shape: UPS "1Z…", FedEx Ground
// "96…" (22 digits) or 12/15 digits, USPS 20-22 digits starting 9 (or a
// "420"+ZIP prefixed barcode).
export function detectCarrier(trackingNumber: string, carrier?: string): string {
  const given = carrier?.trim().toLowerCase();
  if (given) {
    const known = Object.keys(TRACKING_URLS).find(
      (c) => given === c.toLowerCase() || given.startsWith(`${c.toLowerCase()} `)
    );
    if (known) return known;
  }
  if (/^1Z[0-9A-Z]{16}$/i.test(trackingNumber)) return "UPS";
  if (/^96\d{20}$/.test(trackingNumber) || /^(\d{12}|\d{15})$/.test(trackingNumber)) return "FedEx";
  if (/^9\d{19,21}$/.test(trackingNumber) || /^420\d{5}(\d{4})?9\d{19,21}$/.test(trackingNumber)) return "USPS";
  return carrier?.trim() || "USPS";
}

export function shipmentFor(rawTrackingNumber: string, carrier?: string): OrderShipment {
  const trackingNumber = rawTrackingNumber.replace(/\s+/g, "").toUpperCase();
  const name = detectCarrier(trackingNumber, carrier);
  // A carrier we have no tracking page for gets a web search for the number,
  // which surfaces the right carrier's tracker, rather than a USPS link that
  // would show "not found".
  const url = TRACKING_URLS[name] ?? ((n: string) => `https://www.google.com/search?q=${n}`);
  return { carrier: name, trackingNumber, trackingUrl: url(encodeURIComponent(trackingNumber)) };
}
