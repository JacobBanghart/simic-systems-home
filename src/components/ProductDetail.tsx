import {
  Box,
  Typography,
  Button,
  Container,
  ThemeProvider,
  IconButton,
  Badge,
  Chip,
} from "@mui/material";
import { ShoppingCartCheckout, ArrowBack } from "@mui/icons-material";
import { useState } from "react";
import { themeOptions } from "./theme";
import type { ProductData } from "../types";
import { formatPrice } from "../lib/format";
import { CartProvider, useCart } from "./CartProvider";
import { CartDrawer } from "./CartDrawer";
import { ErrorBoundary } from "./ErrorBoundary";

interface ProductDetailProps {
  product: ProductData;
}

const CATEGORY_LABELS: Record<ProductData["category"], string> = {
  magic: "Magic: The Gathering",
  onepiece: "One Piece",
  unionarena: "Union Arena",
};

function ProductDetailContent({ product }: ProductDetailProps) {
  const [cartOpen, setCartOpen] = useState(false);
  const { addToCart, cartCount } = useCart();
  const outOfStock = product.quantity <= 0;

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
        <IconButton
          onClick={() => setCartOpen(true)}
          aria-label="Open shopping cart"
          sx={{
            backgroundColor: "background.paper",
            "&:hover": { backgroundColor: "background.default" },
          }}
        >
          <Badge badgeContent={cartCount} color="primary">
            <ShoppingCartCheckout />
          </Badge>
        </IconButton>
      </Box>

      <Container maxWidth="md" sx={{ py: 2 }}>
        <Button
          href="/"
          startIcon={<ArrowBack />}
          sx={{ mb: 3, textTransform: "none" }}
        >
          Back to Store
        </Button>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 4,
          }}
        >
          <Box
            component="img"
            src={product.image}
            alt={product.name}
            sx={{
              width: { xs: "100%", md: "50%" },
              maxHeight: 500,
              objectFit: "contain",
              borderRadius: 2,
              backgroundColor: "background.paper",
              p: 2,
            }}
          />

          <Box sx={{ flex: 1 }}>
            <Chip
              label={CATEGORY_LABELS[product.category] || product.category}
              size="small"
              sx={{ mb: 1 }}
            />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
              {product.name}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
              {formatPrice(product.price)}
            </Typography>

            <Typography
              variant="body2"
              color={outOfStock ? "error" : "text.secondary"}
              sx={{ mb: 2 }}
            >
              {outOfStock ? "Out of stock" : `${product.quantity} available`}
            </Typography>

            {product.description && (
              <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.7 }}>
                {product.description}
              </Typography>
            )}

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
          </Box>
        </Box>
      </Container>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}

export function ProductDetail({ product }: ProductDetailProps) {
  return (
    <ThemeProvider theme={themeOptions}>
      <ErrorBoundary>
        <CartProvider>
          <ProductDetailContent product={product} />
        </CartProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
