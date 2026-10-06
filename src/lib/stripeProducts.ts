import Stripe from "stripe";
import type { ProductData } from "../types";

export const PRODUCT_CACHE_KEY = "products";
export const PRODUCT_CACHE_TTL_SECONDS = 60;
// A longer-lived copy of the last successful catalog fetch, served when Stripe
// is unreachable so an outage shows (possibly slightly stale) products instead
// of an empty store. Checkout re-checks live stock and prices regardless.
export const PRODUCT_LAST_GOOD_KEY = "products:last-good";
const PRODUCT_LAST_GOOD_TTL_SECONDS = 7 * 24 * 60 * 60;

interface StoreEnv {
  PRODUCT_CACHE: KVNamespace;
  STRIPE_SECRET_KEY: string;
}

export function parseInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const VALID_CATEGORIES: ReadonlySet<string> = new Set<ProductData["category"]>([
  "magic",
  "onepiece",
  "unionarena",
]);

// Prices are resolved by lookup key (= the product's catalogKey metadata) rather
// than product.default_price, because the Stripe Terraform provider can't set
// default_price: a price change there creates a new Price and transfers the
// lookup key to it, leaving default_price pointing at the archived one.
// default_price is still honoured as a fallback for products whose prices
// don't have a lookup key yet.
export function mapStripeProduct(
  product: Stripe.Product,
  lookupPrice?: Stripe.Price
): ProductData | null {
  const fallback =
    product.default_price && typeof product.default_price !== "string"
      ? product.default_price
      : undefined;
  const price = lookupPrice ?? fallback;
  if (!price) {
    return null;
  }

  const rawCategory = product.metadata.category || "magic";
  const category: ProductData["category"] = VALID_CATEGORIES.has(rawCategory)
    ? (rawCategory as ProductData["category"])
    : "magic";

  return {
    id: product.id,
    name: product.name,
    description: product.description || "",
    category,
    price: price.unit_amount || 0,
    priceId: price.id,
    quantity: parseInteger(product.metadata.quantity, 0),
    image: product.images[0] || "",
    sortOrder: parseInteger(product.metadata.sortOrder, 999),
    gtin: product.metadata.gtin || undefined,
    slug: product.metadata.slug || undefined,
    noindex: product.metadata.noindex === "true" || undefined,
    updated: product.updated,
  };
}

async function fetchProductsFromStripe(secretKey: string): Promise<ProductData[]> {
  const stripe = new Stripe(secretKey);
  const [stripeProducts, activePrices] = await Promise.all([
    stripe.products.list({
      active: true,
      limit: 100,
      expand: ["data.default_price"],
    }),
    stripe.prices.list({ active: true, limit: 100 }).autoPagingToArray({ limit: 1000 }),
  ]);
  const pricesByLookupKey = new Map(
    activePrices
      .filter((price) => price.lookup_key)
      .map((price) => [price.lookup_key as string, price])
  );

  return stripeProducts.data
    .map((product) => {
      const key = product.metadata.catalogKey;
      return mapStripeProduct(product, key ? pricesByLookupKey.get(key) : undefined);
    })
    .filter((product): product is ProductData => Boolean(product))
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.name.localeCompare(right.name);
    });
}

export async function fetchStoreProducts(
  env: StoreEnv,
  options: { useCache?: boolean } = {}
): Promise<ProductData[]> {
  const useCache = options.useCache ?? true;

  if (useCache) {
    const cached = (await env.PRODUCT_CACHE.get(
      PRODUCT_CACHE_KEY,
      "json"
    )) as ProductData[] | null;

    if (cached) {
      return cached;
    }
  }

  let products: ProductData[];
  try {
    products = await fetchProductsFromStripe(env.STRIPE_SECRET_KEY);
  } catch (err) {
    const lastGood = (await env.PRODUCT_CACHE.get(PRODUCT_LAST_GOOD_KEY, "json")) as ProductData[] | null;
    if (!lastGood) throw err;
    console.error("Stripe product fetch failed; serving last-known-good catalog:", err);
    return lastGood;
  }

  const serialized = JSON.stringify(products);
  await Promise.all([
    env.PRODUCT_CACHE.put(PRODUCT_CACHE_KEY, serialized, { expirationTtl: PRODUCT_CACHE_TTL_SECONDS }),
    env.PRODUCT_CACHE.put(PRODUCT_LAST_GOOD_KEY, serialized, { expirationTtl: PRODUCT_LAST_GOOD_TTL_SECONDS }),
  ]);

  return products;
}

export async function invalidateProductCache(env: StoreEnv): Promise<void> {
  await env.PRODUCT_CACHE.delete(PRODUCT_CACHE_KEY);
}

// product.updated also fires for every stock change (checkout reservations,
// releases, restocks all write metadata.quantity). Those aren't content
// changes worth asking search engines to recrawl for.
export function isStockOnlyUpdate(previousAttributes: Record<string, unknown> | undefined): boolean {
  if (!previousAttributes) return false;
  return Object.entries(previousAttributes).every(([key, value]) => {
    if (key === "updated") return true;
    if (key !== "metadata" || !value || typeof value !== "object") return false;
    return Object.keys(value).every((metadataKey) => metadataKey === "quantity");
  });
}

export class InsufficientStockError extends Error {
  constructor(
    readonly productId: string,
    readonly productName: string,
    readonly available: number
  ) {
    super(
      available > 0
        ? `${productName} only has ${available} available`
        : `${productName} is unavailable right now — it may be held in another active checkout. Please try again in a few minutes.`
    );
    this.name = "InsufficientStockError";
  }
}

// Applies a signed integer delta (positive to restore/release, negative to
// reserve) to a product's stock metadata, re-reading live stock first. A
// reservation that would take stock below zero throws InsufficientStockError
// instead of clamping: clamping let two checkouts both "reserve" the last unit
// (overselling it) and later released both, inflating stock above what exists.
// Still not a true atomic decrement — two writers can interleave between the
// read and the write — but at this store's volume that window is tiny.
export async function adjustProductStock(
  stripe: Stripe,
  productId: string,
  delta: number
): Promise<void> {
  if (!Number.isInteger(delta)) {
    throw new Error(`Stock delta must be an integer, got ${delta}`);
  }
  if (delta === 0) return;
  const product = await stripe.products.retrieve(productId);
  const liveQuantity = Math.max(0, parseInteger(product.metadata.quantity, 0));
  const next = liveQuantity + delta;
  if (next < 0) {
    throw new InsufficientStockError(productId, product.name || "This product", liveQuantity);
  }
  await stripe.products.update(productId, {
    metadata: { quantity: String(next) },
  });
}

// Fetches a checkout session with its line items (and each line item's
// product) expanded — used by every webhook handler that needs to know what
// was actually purchased (completed/expired/refunded).
export async function retrieveSessionLineItems(
  stripe: Stripe,
  sessionId: string
): Promise<{ session: Stripe.Checkout.Session; lineItems: Stripe.LineItem[] }> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items.data.price.product", "shipping_cost.shipping_rate"],
  });
  return { session, lineItems: session.line_items?.data || [] };
}

// Puts each line item's quantity back into stock — used to release a
// reservation (expired/cancelled/failed checkout) and to restock a refund.
// With `dedupe`, each product is marked in KV as it's restored, so when a
// later item fails and Stripe retries the webhook, items already restored on
// the first attempt aren't restored a second time. Line items with an
// unexpanded product are skipped (shouldn't happen given the expand in
// retrieveSessionLineItems, but isn't guaranteed by the type).
export async function restoreLineItemStock(
  stripe: Stripe,
  lineItems: Stripe.LineItem[],
  dedupe?: { kv: KVNamespace; key: string }
): Promise<void> {
  for (const lineItem of lineItems) {
    const price = lineItem.price;
    if (!price || !price.product || typeof price.product === "string") continue;
    const productId = price.product.id;
    const marker = dedupe ? `${dedupe.key}:${productId}` : undefined;
    if (dedupe && marker && (await dedupe.kv.get(marker))) continue;
    await adjustProductStock(stripe, productId, lineItem.quantity || 0);
    if (dedupe && marker) {
      await dedupe.kv.put(marker, "1", { expirationTtl: 30 * 24 * 60 * 60 });
    }
  }
}
