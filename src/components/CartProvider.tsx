import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type { ProductData } from "../types";
import {
  addItem,
  removeItem,
  setItemQuantity,
  cartTotal as calcTotal,
  cartCount as calcCount,
  isValidCartItem,
  normalizeCart,
  reconcileCart,
  type CartChange,
  type CartLine,
} from "../lib/cart";
import { getPostHog } from "../lib/posthog-client";

interface CartContextValue {
  cartItems: CartLine[];
  addToCart: (product: ProductData) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  /** Changes made by the last reconcile(s) that the shopper hasn't dismissed yet. */
  cartNotices: CartChange[];
  dismissCartNotices: () => void;
  /**
   * Re-sync the cart with the live catalogue (prices, stock, availability).
   * Resolves with the changes it made; a failed /api/products fetch leaves the
   * cart untouched and resolves with [].
   */
  refreshCart: () => Promise<CartChange[]>;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "simic-cart";

function loadCart(): CartLine[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter(isValidCartItem);
    if (valid.length !== parsed.length) {
      console.warn("Cleared invalid items from cart");
    }
    return normalizeCart(valid);
  } catch {
    console.warn("Failed to parse cart from localStorage, resetting");
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartLine[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [cartNotices, setCartNotices] = useState<CartChange[]>([]);
  const cartRef = useRef<CartLine[]>([]);

  useEffect(() => {
    cartRef.current = cartItems;
  }, [cartItems]);

  const refreshCart = useCallback(async (): Promise<CartChange[]> => {
    if (cartRef.current.length === 0) return [];
    let products: ProductData[];
    try {
      const res = await fetch("/api/products");
      if (!res.ok) return [];
      const data: unknown = await res.json();
      if (!Array.isArray(data)) return [];
      products = data as ProductData[];
    } catch {
      return [];
    }
    // While a checkout session id is stored, the shopper may have just backed
    // out of Stripe, and that session is still holding their items: the
    // storefront shows them as sold out *because of the shopper's own hold*.
    // Keep stock out of it then; checkout releases that hold
    // (previousSessionId) and the server re-checks stock anyway.
    let ownHoldPossible = false;
    try {
      ownHoldPossible = Boolean(localStorage.getItem("simic-checkout-session"));
    } catch {
      // ignore
    }
    // Read the ref after the await so we reconcile the latest cart.
    const { cart, changes } = reconcileCart(cartRef.current, products, { ignoreStock: ownHoldPossible });
    if (cart !== cartRef.current) {
      cartRef.current = cart;
      setCartItems(cart);
    }
    if (changes.length > 0) {
      setCartNotices((prev) => [...prev, ...changes]);
      getPostHog()?.capture("cart_reconciled", {
        changes: changes.map((c) => c.type),
      });
    }
    return changes;
  }, []);

  useEffect(() => {
    const loaded = loadCart();
    cartRef.current = loaded;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from localStorage on mount
    setCartItems(loaded);
    setInitialized(true);
    void refreshCart();
  }, [refreshCart]);

  useEffect(() => {
    if (initialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    }
  }, [cartItems, initialized]);

  const addToCart = (product: ProductData) => {
    setCartItems((prev) => addItem(prev, product));
    getPostHog()?.capture("product_added_to_cart", {
      product_slug: product.slug,
      product_name: product.name,
      price_cents: product.price,
      category: product.category,
    });
  };

  const removeFromCart = (productId: string) => {
    const existing = cartItems.find((item) => item.productId === productId);
    setCartItems((prev) => removeItem(prev, productId));
    if (!existing) return;
    if (existing.quantity <= 1) {
      getPostHog()?.capture("cart_item_removed", {
        product_slug: productId,
        product_name: existing.name,
        quantity_removed: existing.quantity,
      });
    } else {
      getPostHog()?.capture("cart_item_quantity_changed", {
        product_slug: productId,
        product_name: existing.name,
        previous_quantity: existing.quantity,
        new_quantity: existing.quantity - 1,
      });
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const existing = cartItems.find((item) => item.productId === productId);
    setCartItems((prev) => setItemQuantity(prev, productId, quantity));
    if (!existing) return;
    // Report the quantity actually applied (capped at stock), not the requested one.
    const applied =
      setItemQuantity(cartItems, productId, quantity).find((item) => item.productId === productId)
        ?.quantity ?? 0;
    if (existing.quantity === applied) return;
    if (applied <= 0) {
      getPostHog()?.capture("cart_item_removed", {
        product_slug: productId,
        product_name: existing.name,
        quantity_removed: existing.quantity,
      });
    } else {
      getPostHog()?.capture("cart_item_quantity_changed", {
        product_slug: productId,
        product_name: existing.name,
        previous_quantity: existing.quantity,
        new_quantity: applied,
      });
    }
  };

  const clearCart = () => setCartItems([]);

  const dismissCartNotices = useCallback(() => setCartNotices([]), []);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal: calcTotal(cartItems),
        cartCount: calcCount(cartItems),
        cartNotices,
        dismissCartNotices,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
