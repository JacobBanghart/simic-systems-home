import type { OrderShipment } from "./orderConfirmation";

const TRACKING_URLS: Record<string, (n: string) => string> = {
  USPS: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
  UPS: (n) => `https://www.ups.com/track?tracknum=${n}`,
  FedEx: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}`,
  DHL: (n) => `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`,
};

// Normalises a hand-typed carrier ("usps", "Fedex") or, when it's missing,
// guesses from the number's shape: UPS "1Z…", USPS 20-22 digits starting 9.
export function detectCarrier(trackingNumber: string, carrier?: string): string {
  const given = carrier?.trim().toLowerCase();
  if (given) {
    const known = Object.keys(TRACKING_URLS).find((c) => c.toLowerCase() === given);
    if (known) return known;
  }
  if (/^1Z[0-9A-Z]{16}$/i.test(trackingNumber)) return "UPS";
  if (/^9\d{19,21}$/.test(trackingNumber)) return "USPS";
  return carrier?.trim() || "USPS";
}

export function shipmentFor(rawTrackingNumber: string, carrier?: string): OrderShipment {
  const trackingNumber = rawTrackingNumber.replace(/\s+/g, "").toUpperCase();
  const name = detectCarrier(trackingNumber, carrier);
  const url = TRACKING_URLS[name] ?? TRACKING_URLS.USPS;
  return { carrier: name, trackingNumber, trackingUrl: url(encodeURIComponent(trackingNumber)) };
}
