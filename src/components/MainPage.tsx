import {
  Grid,
  Typography,
  Box,
  Container,
  ThemeProvider,
  IconButton,
  Badge,
  Stack,
} from "@mui/material";
import { useState } from "react";
import { themeOptions } from "./theme";
import banner from "/banner.webp?url";
import { ShoppingCartCheckout } from "@mui/icons-material";
import type { ProductData } from "../types";
import { ProductCard } from "./ProductCard";
import { CartProvider, useCart } from "./CartProvider";
import { CartDrawer } from "./CartDrawer";

interface MainPageProps {
  products: ProductData[];
}

function StoreContent({ products }: MainPageProps) {
  const [cartOpen, setCartOpen] = useState(false);
  const { addToCart, cartCount } = useCart();

  const renderProductGrid = (items: ProductData[]) => {
    if (items.length === 0) {
      return (
        <Typography sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
          No products available
        </Typography>
      );
    }
    return (
      <Grid
        container
        spacing={{ xs: 2, md: 3 }}
        fontSize={{ xs: "0.5rem", sm: "0.8rem", md: "1rem" }}
        sx={{
          flexWrap: "wrap",
          justifyContent: { xs: "flex-start", sm: "center" },
          gap: "16px",
          containerType: "inline-size",
          paddingTop: "15px",
        }}
      >
        {items.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={addToCart}
          />
        ))}
      </Grid>
    );
  };

  return (
    <>
      {/* Banner with cart overlay */}
      <div style={{ position: "relative" }}>
        <Box
          component="img"
          src={banner}
          alt="Simic Systems — Trading Card Products"
          sx={{
            width: "100%",
            maxHeight: "220px",
            objectFit: "cover",
            objectPosition: "center 20%",
            display: "block",
          }}
        />
        <IconButton
          onClick={() => setCartOpen(true)}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            backgroundColor: "background.paper",
            "&:hover": { backgroundColor: "background.default" },
          }}
        >
          <Badge badgeContent={cartCount} color="primary">
            <ShoppingCartCheckout />
          </Badge>
        </IconButton>
      </div>

      {/* Product Grid */}
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack spacing={1.5} sx={{ mb: 4, maxWidth: 820 }}>
          <Typography component="h1" variant="h3">
            Magic: The Gathering Booster Boxes and Sealed MTG Products
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Shop sealed Magic: The Gathering booster boxes, collector boxes,
            play boosters, and other MTG products with secure checkout and
            United States shipping.
          </Typography>
        </Stack>
        {renderProductGrid(products)}
      </Container>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}

export function MainPage({ products }: MainPageProps) {
  return (
    <ThemeProvider theme={themeOptions}>
      <CartProvider>
        <StoreContent products={products} />
      </CartProvider>
    </ThemeProvider>
  );
}
