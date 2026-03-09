import type { CartItem, ProductData } from "../types";

export function addItem(cart: CartItem[], product: ProductData): CartItem[] {
  const existing = cart.find((item) => item.productId === product.id);
  if (existing) {
    if (existing.quantity >= product.quantity) return cart;
    return cart.map((item) =>
      item.productId === product.id
        ? { ...item, quantity: item.quantity + 1 }
        : item
    );
  }
  return [
    ...cart,
    {
      productId: product.id,
      priceId: product.priceId,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    },
  ];
}

export function removeItem(cart: CartItem[], productId: string): CartItem[] {
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

export function setItemQuantity(
  cart: CartItem[],
  productId: string,
  quantity: number
): CartItem[] {
  if (quantity <= 0) {
    return cart.filter((item) => item.productId !== productId);
  }
  return cart.map((item) =>
    item.productId === productId ? { ...item, quantity } : item
  );
}

export function cartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function cartCount(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}
