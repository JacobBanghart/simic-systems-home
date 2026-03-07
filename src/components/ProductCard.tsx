import {
  Card,
  CardHeader,
  Divider,
  CardMedia,
  CardActions,
  Typography,
  Button,
  Box,
  Grid,
} from "@mui/material";
import type { ProductData } from "../types";

interface ProductCardProps {
  product: ProductData;
  onAddToCart: (product: ProductData) => void;
  scale: number;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ProductCard({ product, onAddToCart, scale }: ProductCardProps) {
  const outOfStock = product.quantity <= 0;

  return (
    <Card
      sx={{
        display: "flex",
        flexDirection: { xs: "row", sm: "column" },
        width: { xs: "100%", sm: `${14 * scale}rem` },
        height: "auto",
        backgroundColor: "background.paper",
        boxShadow: 3,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "8px",
        transformOrigin: "top left",
        opacity: outOfStock ? 0.6 : 1,
      }}
    >
      <CardMedia
        component="img"
        image={product.image}
        alt={product.name}
        sx={{
          paddingX: { xs: "0px", sm: "8px" },
          width: { xs: "40%", sm: "calc(100% - 16px)" },
          marginTop: { xs: "0px", sm: "8px" },
          height: "auto",
          objectFit: "contain",
        }}
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 2,
          flex: 1,
        }}
      >
        <CardHeader
          title={product.name}
          slotProps={{
            title: {
              sx: {
                textAlign: { xs: "left", md: "center" },
                fontSize: `${1.2 * scale}rem`,
                wordBreak: "break-all",
              },
            },
          }}
          sx={{
            maxWidth: "100%",
            padding: "0",
          }}
        />
        <Typography
          sx={{
            textAlign: { xs: "left", md: "center" },
            fontSize: `${1.1 * scale}rem`,
            fontWeight: "bold",
            py: 1,
          }}
        >
          {formatPrice(product.price)}
        </Typography>
        <Divider />
        <CardActions
          sx={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "auto",
            paddingX: 0,
          }}
        >
          <Grid container justifyContent={"left"}>
            <Typography
              gutterBottom
              sx={{
                color: "text.secondary",
                fontSize: `${1 * scale}rem`,
                paddingLeft: "8px",
              }}
            >
              {outOfStock
                ? "Out of Stock"
                : `Qty Available: ${product.quantity}`}
            </Typography>
            <Button
              onClick={() => onAddToCart(product)}
              disabled={outOfStock}
              sx={{
                fontSize: `${0.9 * scale}rem`,
              }}
            >
              {outOfStock ? "Sold Out" : "Add to Cart"}
            </Button>
          </Grid>
        </CardActions>
      </Box>
    </Card>
  );
}
