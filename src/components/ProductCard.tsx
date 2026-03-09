import {
  Card,
  Typography,
  Button,
  Box,
} from "@mui/material";
import type { ProductData } from "../types";
import { formatPrice } from "../lib/format";

interface ProductCardProps {
  product: ProductData;
  onAddToCart: (product: ProductData) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const outOfStock = product.quantity <= 0;

  return (
    <Card
      sx={{
        display: "flex",
        flexDirection: { xs: "row", sm: "column" },
        width: { xs: "100%", sm: "18rem" },
        boxShadow: 3,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "8px",
        opacity: outOfStock ? 0.6 : 1,
        overflow: "hidden",
      }}
    >
      <Box
        component="img"
        src={product.image}
        alt={product.name}
        sx={{
          width: { xs: "40%", sm: "100%" },
          height: { xs: "auto", sm: "14rem" },
          flexShrink: 0,
          objectFit: "contain",
          objectPosition: "center",
          padding: "12px",
          boxSizing: "border-box",
          display: "block",
        }}
      />
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
          sx={{
            fontSize: "0.9rem",
            fontWeight: 600,
            lineHeight: 1.3,
            wordBreak: "break-word",
            textAlign: "center",
          }}
        >
          {product.name}
        </Typography>
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
  );
}
