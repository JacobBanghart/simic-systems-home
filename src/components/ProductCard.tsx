import { Typography, Button, Box, Grid } from "@mui/material";
import { useEffect, useState } from "react";
import type { ProductData } from "../types";
import { formatPrice } from "../lib/format";
import { removeWhiteBackground } from "../lib/removeWhiteBackground";

interface ProductCardProps {
  product: ProductData;
  onAddToCart: (product: ProductData) => void;
}

function useCutoutImage(src: string) {
  const [resolvedSrc, setResolvedSrc] = useState(src);
  const [prevSrc, setPrevSrc] = useState(src);

  // Reset synchronously during render when src changes, rather than via an
  // effect — this is React's documented pattern for "adjusting state when a
  // prop changes" and avoids an extra committed render each time src changes.
  if (src !== prevSrc) {
    setPrevSrc(src);
    setResolvedSrc(src);
  }

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    removeWhiteBackground(src)
      .then((dataUrl) => {
        if (!cancelled) setResolvedSrc(dataUrl);
      })
      .catch(() => {
        // Leave the original image in place if cutout processing fails.
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return resolvedSrc;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const outOfStock = product.quantity <= 0;
  const lowStock = !outOfStock && product.quantity <= 3;
  const productUrl = `/product/${product.slug ?? product.id}/`;
  const imageSrc = useCutoutImage(product.imageOptimized ?? product.image);

  return (
    <Grid size={{ xs: 6, sm: 6, md: 4, lg: 3 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          opacity: outOfStock ? 0.55 : 1,
        }}
      >
        <Box
          component="a"
          href={productUrl}
          className="editorial-border biolume-glow-subtle"
          sx={{
            position: "relative",
            aspectRatio: "1 / 1",
            mb: 1.5,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            paddingTop: "40px",
            textDecoration: "none",
            backgroundColor: "background.paper",
            borderRadius: "4px",
          }}
        >
          <Box
            component="img"
            src={imageSrc}
            alt={product.name}
            loading="lazy"
            width={400}
            height={400}
            crossOrigin="anonymous"
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center",
              transition: "transform 0.5s",
              "a:hover &": { transform: "scale(1.05)" },
            }}
          />
          {(outOfStock || lowStock) && (
            <Box
              sx={{
                position: "absolute",
                top: 10,
                left: 10,
                px: "8px",
                py: "4px",
                borderRadius: "2px",
                backgroundColor: "color-mix(in srgb, var(--md-error-container) 25%, transparent)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                color: "var(--md-error)",
                border: "1px solid",
                borderColor: "color-mix(in srgb, var(--md-error) 35%, transparent)",
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "9px",
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              {outOfStock ? "Sold Out" : "Low Stock"}
            </Box>
          )}
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
          {product.category && (
            <Typography className="label-caps" sx={{ color: "text.secondary", opacity: 0.7 }}>
              {product.category}
            </Typography>
          )}
          <Typography
            component="a"
            href={productUrl}
            sx={{
              fontFamily: '"Hanken Grotesk", sans-serif',
              fontSize: "0.95rem",
              lineHeight: 1.3,
              wordBreak: "break-word",
              textDecoration: "none",
              color: "text.primary",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              "&:hover": { color: "primary.main" },
            }}
          >
            {product.name}
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mt: "auto",
              pt: "6px",
            }}
          >
            <Typography className="price-display" sx={{ fontSize: "0.95rem", color: "text.primary" }}>
              {formatPrice(product.price)}
            </Typography>
            {!outOfStock && (
              <Typography className="label-caps" sx={{ color: "primary.main" }}>
                {product.quantity} Avail
              </Typography>
            )}
          </Box>
          <Button
            variant="outlined"
            onClick={() => onAddToCart(product)}
            disabled={outOfStock}
            fullWidth
            size="small"
            sx={{ mt: "10px" }}
          >
            {outOfStock ? "Sold Out" : "Add to Cart"}
          </Button>
        </Box>
      </Box>
    </Grid>
  );
}
