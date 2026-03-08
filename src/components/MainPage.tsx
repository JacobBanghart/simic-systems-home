import {
  Grid,
  Typography,
  Box,
  Container,
  ThemeProvider,
  IconButton,
  Badge,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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

type SortOption = "featured" | "price-asc" | "price-desc" | "name-asc" | "stock-desc";

function StoreContent({ products }: MainPageProps) {
  const [cartOpen, setCartOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const { addToCart, cartCount } = useCart();

  const sortedProducts = [...products].sort((left, right) => {
    switch (sortBy) {
      case "price-asc":
        return left.price - right.price;
      case "price-desc":
        return right.price - left.price;
      case "name-asc":
        return left.name.localeCompare(right.name);
      case "stock-desc":
        return right.quantity - left.quantity;
      case "featured":
      default:
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }

        return left.name.localeCompare(right.name);
    }
  });

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
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ mb: 4, alignItems: { xs: "stretch", md: "flex-end" } }}
        >
          <Stack spacing={1.5} sx={{ flex: 1, maxWidth: 820 }}>
            <Typography component="h1" variant="h3">
              Magic: The Gathering Booster Boxes and Sealed MTG Products
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Shop sealed Magic: The Gathering booster boxes, collector boxes,
              play boosters, and other MTG products with secure checkout and
              United States shipping.
            </Typography>
          </Stack>
          <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 240 } }}>
            <InputLabel id="sort-products-label">Sort Products</InputLabel>
            <Select
              labelId="sort-products-label"
              value={sortBy}
              label="Sort Products"
              onChange={(event) => setSortBy(event.target.value as SortOption)}
            >
              <MenuItem value="featured">Featured</MenuItem>
              <MenuItem value="price-asc">Price: Low to High</MenuItem>
              <MenuItem value="price-desc">Price: High to Low</MenuItem>
              <MenuItem value="name-asc">Name: A to Z</MenuItem>
              <MenuItem value="stock-desc">Stock: High to Low</MenuItem>
            </Select>
          </FormControl>
        </Stack>
        {renderProductGrid(sortedProducts)}
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
