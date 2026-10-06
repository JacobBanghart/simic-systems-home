// Validation for POST /api/create-checkout bodies.

export const MAX_LINES = 20;
export const MAX_QUANTITY_PER_ITEM = 10;

// A problem with what the shopper asked for: shown to them verbatim as a 400.
// Anything else is ours (or Stripe's) and gets a generic 500.
export class CheckoutError extends Error {}

export interface CheckoutRequest {
  items: { priceId: string; quantity: number }[];
  previousSessionId?: string;
}

// Strict on purpose: quantities feed straight into stock arithmetic, and a
// missing, fractional or string quantity used to write "NaN" or "0.5" into a
// product's stock metadata (reading back as 0, i.e. sold out) — from a single
// anonymous request. Duplicate lines for the same price are merged so each is
// checked against stock once, as a total.
export function parseCheckoutRequest(body: unknown): CheckoutRequest {
  const { items, previousSessionId } = (body ?? {}) as { items?: unknown; previousSessionId?: unknown };
  if (!Array.isArray(items) || items.length === 0) throw new CheckoutError("Cart is empty");
  if (items.length > MAX_LINES) throw new CheckoutError("Too many items in cart");

  const merged = new Map<string, number>();
  for (const item of items as { priceId?: unknown; quantity?: unknown }[]) {
    const { priceId, quantity } = item ?? {};
    if (typeof priceId !== "string" || !/^price_[A-Za-z0-9]+$/.test(priceId)) {
      throw new CheckoutError("Invalid cart item");
    }
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
      throw new CheckoutError("Invalid cart item");
    }
    merged.set(priceId, (merged.get(priceId) ?? 0) + quantity);
  }
  for (const quantity of merged.values()) {
    if (quantity > MAX_QUANTITY_PER_ITEM) {
      throw new CheckoutError(`Limit ${MAX_QUANTITY_PER_ITEM} of each item per order`);
    }
  }

  return {
    items: [...merged].map(([priceId, quantity]) => ({ priceId, quantity })),
    previousSessionId: typeof previousSessionId === "string" ? previousSessionId : undefined,
  };
}
