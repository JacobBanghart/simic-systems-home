import Stripe from "stripe";
import type { ProductData } from "../types";

export const PRODUCT_CACHE_KEY = "products";
export const PRODUCT_CACHE_TTL_SECONDS = 60;

interface StoreEnv {
  PRODUCT_CACHE: KVNamespace;
  STRIPE_SECRET_KEY: string;
}

export function parseInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function mapStripeProduct(product: Stripe.Product): ProductData | null {
  if (!product.default_price || typeof product.default_price === "string") {
    return null;
  }

  const price = product.default_price as Stripe.Price;

  return {
    id: product.id,
    name: product.name,
    description: product.description || "",
    category: (product.metadata.category as ProductData["category"]) || "magic",
    price: price.unit_amount || 0,
    priceId: price.id,
    quantity: parseInteger(product.metadata.quantity, 0),
    image: product.images[0] || "",
    sortOrder: parseInteger(product.metadata.sortOrder, 999),
  };
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

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const stripeProducts = await stripe.products.list({
    active: true,
    limit: 100,
    expand: ["data.default_price"],
  });

  const products = stripeProducts.data
    .map(mapStripeProduct)
    .filter((product): product is ProductData => Boolean(product))
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.name.localeCompare(right.name);
    });

  await env.PRODUCT_CACHE.put(PRODUCT_CACHE_KEY, JSON.stringify(products), {
    expirationTtl: PRODUCT_CACHE_TTL_SECONDS,
  });

  return products;
}

export async function invalidateProductCache(env: StoreEnv): Promise<void> {
  await env.PRODUCT_CACHE.delete(PRODUCT_CACHE_KEY);
}