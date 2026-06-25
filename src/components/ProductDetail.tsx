import { Box, Typography, Button, Container, ThemeProvider, Chip, Breadcrumbs, Divider } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { themeOptions } from "./theme";
import type { ProductData } from "../types";
import { formatPrice } from "../lib/format";
import { CartProvider, useCart } from "./CartProvider";
import { CartButton } from "./CartButton";
import { ErrorBoundary } from "./ErrorBoundary";

interface ProductDetailProps {
  product: ProductData;
  relatedProducts?: ProductData[];
}

const CATEGORY_LABELS: Record<string, string> = {
  magic: "Magic: The Gathering",
};

function ProductDetailContent({ product, relatedProducts = [] }: ProductDetailProps) {
  const { addToCart } = useCart();
  const outOfStock = product.quantity <= 0;
  const m = product.name.match(/ \([A-Z0-9]{2,5}\)\s*$/u);
  const displayName = m
    ? (() => { const base = product.name.slice(0, m.index); const sep = base.lastIndexOf(' - '); return sep >= 0 ? base.slice(0, sep).trim() : product.name.trim(); })()
    : product.name.trim();

  return (
    <>
      {/* Cart button (portaled into header) */}
      <CartButton />

      <Container maxWidth="md" sx={{ py: 2 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
          <Box
            component="a"
            href="/"
            sx={{ color: "text.secondary", textDecoration: "none", fontSize: "0.85rem", "&:hover": { color: "primary.main" } }}
          >
            Store
          </Box>
          <Typography color="text.primary" sx={{ fontSize: "0.85rem" }}>{displayName}</Typography>
        </Breadcrumbs>

        <Button href="/" startIcon={<ArrowBack />} sx={{ mb: 3, textTransform: "none" }}>
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
            alt={displayName}
            loading="eager"
            width={500}
            height={500}
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
              {displayName}
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

            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Ships 1–3 business days · USPS · United States only
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Secure checkout · Visa · Mastercard · Amex · Apple Pay · Google Pay
            </Typography>

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
              <Typography variant="body2" sx={{ mt: 1.5, color: "text.secondary" }}>
                Want to be notified when this is back in stock?{" "}
                <Box
                  component="a"
                  href={`mailto:contact@simic.systems?subject=Restock+Alert:+${encodeURIComponent(displayName)}`}
                  sx={{ color: "primary.main" }}
                >
                  Email us
                </Box>
              </Typography>
            )}
          </Box>
        </Box>

        {relatedProducts.length > 0 && (
          <Box sx={{ mt: 6 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              You might also like
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {relatedProducts.map((rel) => (
                <Box
                  key={rel.id}
                  component="a"
                  href={`/product/${rel.slug ?? rel.id}/`}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    width: { xs: "calc(50% - 8px)", sm: 180 },
                    textDecoration: "none",
                    color: "text.primary",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    overflow: "hidden",
                    "&:hover": { borderColor: "primary.main" },
                  }}
                >
                  <Box
                    component="img"
                    src={rel.image}
                    alt={rel.name}
                    loading="lazy"
                    width={180}
                    height={180}
                    sx={{ width: "100%", height: 120, objectFit: "contain", p: 1 }}
                  />
                  <Box sx={{ p: 1 }}>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, lineHeight: 1.3, mb: 0.5 }}>
                      {rel.name.replace(/ - [^-]+ \([A-Z0-9]{2,5}\)\s*$/u, "").trim()}
                    </Typography>
                    <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
                      {(rel.price / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Container>
    </>
  );
}

export function ProductDetail({ product, relatedProducts }: ProductDetailProps) {
  return (
    <ThemeProvider theme={themeOptions}>
      <ErrorBoundary>
        <CartProvider>
          <ProductDetailContent product={product} relatedProducts={relatedProducts} />
        </CartProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
