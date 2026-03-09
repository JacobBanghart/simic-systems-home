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
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { useState } from "react";
import { themeOptions } from "./theme";
import banner from "/banner.webp?url";
import { ShoppingCartCheckout, Search, Clear } from "@mui/icons-material";
import type { ProductData } from "../types";
import { ProductCard } from "./ProductCard";
import { CartProvider, useCart } from "./CartProvider";
import { CartDrawer } from "./CartDrawer";
import { ErrorBoundary } from "./ErrorBoundary";

interface MainPageProps {
  products: ProductData[];
}

type SortOption = "featured" | "price-asc" | "price-desc" | "name-asc" | "stock-desc";

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  magic: "Magic",
  onepiece: "One Piece",
  unionarena: "Union Arena",
};

function StoreContent({ products }: MainPageProps) {
  const [cartOpen, setCartOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const { addToCart, cartCount } = useCart();

  const uniqueCategories = [...new Set(products.map((p) => p.category))];
  const hasMultipleCategories = uniqueCategories.length > 1;
  const categories = ["all", ...uniqueCategories];

  const filteredProducts = products
    .filter((product) => {
      if (category !== "all" && product.category !== category) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((left, right) => {
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
          {searchQuery || category !== "all"
            ? "No products found"
            : "No products available"}
        </Typography>
      );
    }
    return (
      <Grid
        container
        spacing={{ xs: 2, md: 3 }}
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
          aria-label="Open shopping cart"
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
        {/* Controls: Category Filters, Sort, Search */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ mb: 3, alignItems: { sm: "center" }, justifyContent: "space-between" }}
        >
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 200 } }}>
            <InputLabel id="sort-products-label">Sort</InputLabel>
            <Select
              labelId="sort-products-label"
              value={sortBy}
              label="Sort"
              onChange={(event) => setSortBy(event.target.value as SortOption)}
            >
              <MenuItem value="featured">Featured</MenuItem>
              <MenuItem value="price-asc">Price: Low to High</MenuItem>
              <MenuItem value="price-desc">Price: High to Low</MenuItem>
              <MenuItem value="name-asc">Name: A to Z</MenuItem>
              <MenuItem value="stock-desc">Stock: High to Low</MenuItem>
            </Select>
          </FormControl>
          {hasMultipleCategories && (
            <ToggleButtonGroup
              value={category}
              exclusive
              onChange={(_e, value) => {
                if (value !== null) setCategory(value);
              }}
              size="small"
              aria-label="Filter by category"
              sx={{
                flexWrap: "wrap",
                "& .MuiToggleButton-root": {
                  textTransform: "none",
                  px: 2,
                },
              }}
            >
              {categories.map((cat) => (
                <ToggleButton key={cat} value={cat}>
                  {CATEGORY_LABELS[cat] || cat}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
          <TextField
            size="small"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ minWidth: { xs: "100%", sm: 250 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery("")} aria-label="Clear search">
                      <Clear fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
        </Stack>

        {renderProductGrid(filteredProducts)}

        {/* SEO content — visible but below the fold */}
        <Box sx={{ mt: 6, pt: 4, borderTop: "1px solid", borderColor: "divider" }}>
          <Typography component="h1" variant="h5" sx={{ mb: 1, fontSize: { xs: "1.1rem", sm: "1.3rem" } }}>
            Magic: The Gathering Booster Boxes and Sealed MTG Products
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Shop sealed Magic: The Gathering booster boxes, collector boxes,
            play boosters, and other MTG products with secure checkout and
            United States shipping.
          </Typography>
        </Box>
      </Container>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}

export function MainPage({ products }: MainPageProps) {
  return (
    <ThemeProvider theme={themeOptions}>
      <ErrorBoundary>
        <CartProvider>
          <StoreContent products={products} />
        </CartProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
