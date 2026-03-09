import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { CartItem, ProductData } from "../types";
import {
  addItem,
  removeItem,
  setItemQuantity,
  cartTotal as calcTotal,
  cartCount as calcCount,
} from "../lib/cart";

interface CartContextValue {
  cartItems: CartItem[];
  addToCart: (product: ProductData) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "simic-cart";

function isValidCartItem(item: unknown): item is CartItem {
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

function loadCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter(isValidCartItem);
    if (valid.length !== parsed.length) {
      console.warn("Cleared invalid items from cart");
    }
    return valid;
  } catch {
    console.warn("Failed to parse cart from localStorage, resetting");
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from localStorage on mount
    setCartItems(loadCart());
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (initialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    }
  }, [cartItems, initialized]);

  const addToCart = (product: ProductData) => {
    setCartItems((prev) => addItem(prev, product));
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prev) => removeItem(prev, productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCartItems((prev) => setItemQuantity(prev, productId, quantity));
  };

  const clearCart = () => setCartItems([]);

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
