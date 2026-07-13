import { Button, ThemeProvider } from "@mui/material";
import { themeOptions } from "./theme";
import type { ProductData } from "../types";
import { CartProvider, useCart } from "./CartProvider";
import { CartButton } from "./CartButton";
import { ErrorBoundary } from "./ErrorBoundary";

interface AddToCartSectionProps {
  product: ProductData;
}

function AddToCartContent({ product }: AddToCartSectionProps) {
  const { addToCart } = useCart();
  const outOfStock = product.quantity <= 0;

  return (
    <>
      <CartButton />
      <Button
        variant="contained"
        size="large"
        onClick={() => addToCart(product)}
        disabled={outOfStock}
        fullWidth
        sx={{ textTransform: "none", fontSize: "1rem" }}
      >
        {outOfStock ? "Sold Out" : "Add to Cart"}
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
