import type { CartItem, ProductData } from "../types";
import { formatPrice } from "./format";

/**
 * A cart line. `stock` is the stock level last seen for the product (set by
 * addItem and reconcileCart); when present, quantity is never raised above it.
 * Older carts in localStorage have no `stock` until the first reconcile.
 */
export type CartLine = CartItem & { stock?: number };

// Mirrors the server's checkout validation (/api/create-checkout).
export const MAX_LINE_QUANTITY = 10;
export const MAX_CART_LINES = 20;

export function isValidCartItem(item: unknown): item is CartLine {
  if (typeof item !== "object" || item === null) return false;
  const record = item as Record<string, unknown>;
  return (
    typeof record.productId === "string" &&
    typeof record.priceId === "string" &&
    typeof record.name === "string" &&
    typeof record.price === "number" &&
    typeof record.image === "string" &&
    typeof record.quantity === "number" &&
    record.quantity > 0
  );
}

/** Highest quantity allowed for a line: per-line server cap, then known stock. */
export function maxQuantityFor(item: Pick<CartLine, "stock">): number {
  if (typeof item.stock === "number" && Number.isFinite(item.stock)) {
    return Math.max(0, Math.min(MAX_LINE_QUANTITY, Math.floor(item.stock)));
  }
  return MAX_LINE_QUANTITY;
}

export function addItem(cart: CartLine[], product: ProductData): CartLine[] {
  const existing = cart.find((item) => item.productId === product.id);
  const limit = Math.min(MAX_LINE_QUANTITY, Math.floor(product.quantity));
  if (existing) {
    if (existing.quantity >= limit) return cart;
    return cart.map((item) =>
      item.productId === product.id
        ? { ...item, quantity: item.quantity + 1, stock: product.quantity }
        : item
    );
  }
  if (limit < 1) return cart;
  return [
    ...cart,
    {
      productId: product.id,
      priceId: product.priceId,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
      stock: product.quantity,
    },
  ];
}

export function removeItem(cart: CartLine[], productId: string): CartLine[] {
  const existing = cart.find((item) => item.productId === productId);
  if (!existing) return cart;
  if (existing.quantity <= 1) {
    return cart.filter((item) => item.productId !== productId);
  }
  return cart.map((item) =>
    item.productId === productId
      ? { ...item, quantity: item.quantity - 1 }
      : item
  );
}

/**
 * Sets a line's quantity. Quantities are whole numbers; <= 0 removes the line;
 * the result is capped at the line's known stock and the per-line maximum.
 * A non-finite quantity is ignored.
 */
export function setItemQuantity(
  cart: CartLine[],
  productId: string,
  quantity: number
): CartLine[] {
  if (!Number.isFinite(quantity)) return cart;
  const whole = Math.floor(quantity);
  if (whole <= 0) {
    return cart.filter((item) => item.productId !== productId);
  }
  const existing = cart.find((item) => item.productId === productId);
  if (!existing) return cart;
  const next = Math.min(whole, maxQuantityFor(existing));
  if (next < 1) {
    return cart.filter((item) => item.productId !== productId);
  }
  if (next === existing.quantity) return cart;
  return cart.map((item) =>
    item.productId === productId ? { ...item, quantity: next } : item
  );
}

export function cartTotal(cart: CartLine[]): number {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function cartCount(cart: CartLine[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Collapse a hydrated cart: one line per productId (quantities merged), whole
 * quantities only. Returns the same array when nothing needed fixing.
 */
export function normalizeCart(cart: CartLine[]): CartLine[] {
  const seen = new Map<string, CartLine>();
  let changed = false;
  for (const item of cart) {
    const quantity = Math.floor(item.quantity);
    if (quantity !== item.quantity) changed = true;
    if (quantity < 1) {
      changed = true;
      continue;
    }
    const prior = seen.get(item.productId);
    if (prior) {
      changed = true;
      seen.set(item.productId, {
        ...prior,
        quantity: Math.min(prior.quantity + quantity, maxQuantityFor(prior)),
      });
    } else {
      seen.set(item.productId, quantity === item.quantity ? item : { ...item, quantity });
    }
  }
  return changed ? [...seen.values()] : cart;
}

/**
 * Lines to POST to /api/create-checkout: one line per priceId (quantities
 * merged), integer quantities in 1..MAX_LINE_QUANTITY, at most MAX_CART_LINES.
 */
export function toCheckoutItems(
  cart: CartLine[]
): { priceId: string; quantity: number }[] {
  const merged = new Map<string, number>();
  for (const item of cart) {
    const quantity = Math.floor(item.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) continue;
    merged.set(item.priceId, (merged.get(item.priceId) ?? 0) + quantity);
  }
  return [...merged.entries()]
    .slice(0, MAX_CART_LINES)
    .map(([priceId, quantity]) => ({
      priceId,
      quantity: Math.min(quantity, MAX_LINE_QUANTITY),
    }));
}

export type CartChange =
  | { type: "removed"; name: string }
  | { type: "sold_out"; name: string }
  | { type: "price_changed"; name: string; oldPrice: number; newPrice: number }
  | { type: "reduced"; name: string; oldQuantity: number; newQuantity: number };

export function describeCartChange(change: CartChange): string {
  switch (change.type) {
    case "removed":
      return `${change.name} is no longer available and was removed`;
    case "sold_out":
      return `${change.name} is sold out and was removed`;
    case "price_changed":
      return `Price updated: ${change.name} is now ${formatPrice(change.newPrice)}`;
    case "reduced":
      return `Only ${change.newQuantity} of ${change.name} available; quantity reduced from ${change.oldQuantity}`;
  }
}

/**
 * Bring a persisted cart in line with the live catalogue. Pure.
 *
 * - product gone from the list           -> line dropped ("removed")
 * - priceId/price/name/image changed     -> line refreshed ("price_changed" when
 *                                           the amount differs; a new priceId at
 *                                           the same price is refreshed silently)
 * - stock 0                              -> line dropped ("sold_out")
 * - quantity > stock (or per-line max)   -> capped ("reduced")
 *
 * Every surviving line gets its `stock` refreshed. Returns the same `cart`
 * reference when nothing changed.
 */
export function reconcileCart(
  cart: CartLine[],
  products: ProductData[],
  options: { ignoreStock?: boolean } = {}
): { cart: CartLine[]; changes: CartChange[] } {
  const byId = new Map(products.map((p) => [p.id, p]));
  const changes: CartChange[] = [];
  let modified = false;
  const next: CartLine[] = [];

  for (const item of cart) {
    const product = byId.get(item.productId);
    if (!product) {
      changes.push({ type: "removed", name: item.name });
      modified = true;
      continue;
    }

    // ignoreStock: keep the line's last-known stock and quantity as they are
    // (only prices/names/removals are synced).
    const stock = options.ignoreStock ? item.stock : Math.max(0, Math.floor(product.quantity));
    if (stock !== undefined && stock < 1) {
      changes.push({ type: "sold_out", name: product.name });
      modified = true;
      continue;
    }

    let updated = item;
    if (
      item.priceId !== product.priceId ||
      item.price !== product.price ||
      item.name !== product.name ||
      item.image !== product.image ||
      item.stock !== stock
    ) {
      updated = {
        ...item,
        priceId: product.priceId,
        price: product.price,
        name: product.name,
        image: product.image,
        stock,
      };
      modified = true;
      if (item.price !== product.price) {
        changes.push({
          type: "price_changed",
          name: product.name,
          oldPrice: item.price,
          newPrice: product.price,
        });
      }
    }

    const cap = Math.min(stock ?? MAX_LINE_QUANTITY, MAX_LINE_QUANTITY);
    if (updated.quantity > cap) {
      changes.push({
        type: "reduced",
        name: product.name,
        oldQuantity: updated.quantity,
        newQuantity: cap,
      });
      updated = { ...updated, quantity: cap };
      modified = true;
    }

    next.push(updated);
  }

  return modified ? { cart: next, changes } : { cart, changes };
}
