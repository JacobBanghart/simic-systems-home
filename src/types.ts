export interface ProductData {
  id: string;
  name: string;
  description: string;
  category: "magic" | "onepiece" | "unionarena";
  price: number;
  priceId: string;
  quantity: number;
  image: string;
  /** WebP-optimized rendition of `image` via Cloudflare Images, when available. */
  imageOptimized?: string;
  sortOrder: number;
  gtin?: string;
  slug?: string;
  noindex?: boolean;
}

export interface CartItem {
  productId: string;
  priceId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}
