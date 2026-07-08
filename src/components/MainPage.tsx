import {
  Grid,
  Typography,
  Box,
  Container,
  ThemeProvider,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { useState, useEffect } from "react";
import { themeOptions } from "./theme";
import { Clear } from "@mui/icons-material";
import type { ProductData } from "../types";
import { ProductCard } from "./ProductCard";
import { CartProvider, useCart } from "./CartProvider";
import { CartButton } from "./CartButton";
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
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const { addToCart } = useCart();

  useEffect(() => {
    const handler = (e: Event) => {
      const value = (e as CustomEvent<string>).detail ?? "";
      setSearchQuery(value);
    };
    window.addEventListener("site-search", handler);
    return () => window.removeEventListener("site-search", handler);
  }, []);

  const clearSearch = () => {
    setSearchQuery("");
    const heroInput = document.getElementById("hero-search-input") as HTMLInputElement | null;
    if (heroInput) heroInput.value = "";
  };

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
          {searchQuery || category !== "all" ? "No products found" : "No products available"}
        </Typography>
      );
    }
    return (
      <Grid container spacing={{ xs: 2, md: 3 }}>
        {items.map((product) => (
          <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
        ))}
      </Grid>
    );
  };

  return (
    <>
      {/* Cart button (portaled into header) */}
      <CartButton />

      {/* Product Grid */}
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        {/* Section header: heading + sort, matching editorial layout */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          sx={{
            mb: 3,
            pb: 2,
            alignItems: { md: "flex-end" },
            justifyContent: "space-between",
            borderBottom: "1px solid",
            borderColor: "divider",
            gap: 2,
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Libre Caslon Text", serif',
              fontStyle: "italic",
              fontSize: { xs: "1.5rem", md: "2rem" },
              fontWeight: 400,
            }}
          >
            Sealed Collection
          </Typography>
          <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 200 } }}>
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
        </Stack>

        {/* Category filters + active search indicator */}
        {(hasMultipleCategories || searchQuery) && (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ mb: 4, alignItems: { sm: "center" }, justifyContent: "space-between" }}
          >
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
            {searchQuery && (
              <Chip
                label={`Results for "${searchQuery}"`}
                onDelete={clearSearch}
                deleteIcon={<Clear fontSize="small" />}
                variant="outlined"
                sx={{ ml: { sm: "auto" } }}
              />
            )}
          </Stack>
        )}

        {renderProductGrid(filteredProducts)}
      </Container>
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
