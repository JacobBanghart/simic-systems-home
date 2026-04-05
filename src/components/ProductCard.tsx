import {
  Card,
  Typography,
  Button,
  Box,
  Grid,
} from "@mui/material";
import type { ProductData } from "../types";
import { formatPrice } from "../lib/format";

interface ProductCardProps {
  product: ProductData;
  onAddToCart: (product: ProductData) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const outOfStock = product.quantity <= 0;
  const productUrl = `/product/${product.id}/`;

  return (
    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
      <Card
        sx={{
          display: "flex",
          flexDirection: { xs: "row", sm: "column" },
          height: "100%",
          boxShadow: 3,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "8px",
          opacity: outOfStock ? 0.6 : 1,
          overflow: "hidden",
        }}
      >
      <Box
        component="a"
        href={productUrl}
        sx={{
          width: { xs: "40%", sm: "100%" },
          flexShrink: 0,
          display: "block",
          textDecoration: "none",
        }}
      >
        <Box
          component="img"
          src={product.image}
          alt={product.name}
          loading="lazy"
          width={400}
          height={400}
          sx={{
            width: "100%",
            height: { xs: "auto", sm: "14rem" },
            objectFit: "contain",
            objectPosition: "center",
            padding: "12px",
            boxSizing: "border-box",
            display: "block",
          }}
        />
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          padding: "12px",
          flex: 1,
          gap: "4px",
        }}
      >
        <Typography
          component="a"
          href={productUrl}
          sx={{
            fontSize: "0.9rem",
            fontWeight: 600,
            lineHeight: 1.3,
            wordBreak: "break-word",
            textAlign: "center",
            textDecoration: "none",
            color: "text.primary",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          {product.name}
        </Typography>
        {product.description && (
          <Typography
            sx={{
              fontSize: "0.78rem",
              color: "text.secondary",
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {product.description}
          </Typography>
        )}
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            mt: "auto",
            pt: "8px",
          }}
        >
          <Typography
            sx={{
              fontSize: "1.1rem",
              fontWeight: 700,
            }}
          >
            {formatPrice(product.price)}
          </Typography>
          <Typography
            sx={{
              color: "text.secondary",
              fontSize: "0.75rem",
            }}
          >
            {outOfStock ? "Out of stock" : `${product.quantity} available`}
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => onAddToCart(product)}
          disabled={outOfStock}
          fullWidth
          size="small"
          sx={{
            mt: "8px",
            fontSize: "0.8rem",
            textTransform: "none",
          }}
        >
          {outOfStock ? "Sold Out" : "Add to Cart"}
        </Button>
      </Box>
      </Card>
    </Grid>
  );
}
