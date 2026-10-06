import { Button, ThemeProvider } from "@mui/material";
import { themeOptions } from "./theme";
import type { ProductData } from "../types";
import { CartProvider, useCart } from "./CartProvider";
import { MAX_LINE_QUANTITY } from "../lib/cart";
import { CartButton } from "./CartButton";
import { ErrorBoundary } from "./ErrorBoundary";

interface AddToCartSectionProps {
  product: ProductData;
}

function AddToCartContent({ product }: AddToCartSectionProps) {
  const { addToCart, cartItems } = useCart();
  const outOfStock = product.quantity <= 0;
  const inCart = cartItems.find((item) => item.productId === product.id)?.quantity ?? 0;
  const atLimit = !outOfStock && inCart >= Math.min(product.quantity, MAX_LINE_QUANTITY);

  return (
    <>
      <CartButton />
      <Button
        variant="contained"
        size="large"
        onClick={() => addToCart(product)}
        disabled={outOfStock || atLimit}
        fullWidth
        sx={{ textTransform: "none", fontSize: "1rem" }}
      >
        {outOfStock ? "Sold Out" : atLimit ? "Max in Cart" : "Add to Cart"}
      </Button>
      {outOfStock && (
        <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "rgb(var(--gray))", marginBottom: 0 }}>
          Want to be notified when back in stock?{" "}
          <a
            href={`mailto:contact@simic.systems?subject=Restock+Alert:+${encodeURIComponent(product.name)}`}
            style={{ color: "inherit" }}
          >
            Email us
          </a>
        </p>
      )}
    </>
  );
}

export function AddToCartSection({ product }: AddToCartSectionProps) {
  return (
    <ThemeProvider theme={themeOptions}>
      <ErrorBoundary>
        <CartProvider>
          <AddToCartContent product={product} />
        </CartProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
