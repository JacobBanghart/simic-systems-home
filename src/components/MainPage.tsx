import {
  Paper,
  Grid,
  Typography,
  Box,
  Tab,
  Tabs,
  Slider,
  Container,
  ThemeProvider,
  IconButton,
  Badge,
} from "@mui/material";
import { useState } from "react";
import { themeOptions } from "./theme";
import banner from "/banner.webp?url";
import { ShoppingCartCheckout } from "@mui/icons-material";
import type { ProductData } from "../types";
import { ProductCard } from "./ProductCard";
import { CartProvider, useCart } from "./CartProvider";
import { CartDrawer } from "./CartDrawer";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <Paper
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </Paper>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

interface MainPageProps {
  products: ProductData[];
}

function StoreContent({ products }: MainPageProps) {
  const [value, setValue] = useState(0);
  const [scale, setScale] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const { addToCart, cartCount } = useCart();

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleScaleChange = (_event: Event, newValue: number | number[]) => {
    setScale(newValue as number);
  };

  const magicProducts = products.filter((p) => p.category === "magic");
  const onepieceProducts = products.filter((p) => p.category === "onepiece");
  const unionarenaProducts = products.filter(
    (p) => p.category === "unionarena"
  );

  const renderProductGrid = (categoryProducts: ProductData[]) => {
    if (categoryProducts.length === 0) {
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
        {categoryProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={addToCart}
            scale={scale}
          />
        ))}
      </Grid>
    );
  };

  return (
    <>
      <Paper sx={{ display: "flex" }}>
        <Container>
          <Box
            component="img"
            src={banner}
            alt="Simic Systems Banner Image"
            sx={{
              maxHeight: "200px",
              width: "100%",
              objectFit: "cover",
              objectPosition: "-0% 20%",
            }}
          />
          <Box sx={{ width: "100%" }}>
            <Box
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <Tabs
                value={value}
                onChange={handleChange}
                aria-label="product category tabs"
              >
                <Tab label="Magic" {...a11yProps(0)} />
                <Tab label="One Piece" {...a11yProps(1)} />
                <Tab label="Union Arena" {...a11yProps(2)} />
              </Tabs>
              <IconButton onClick={() => setCartOpen(true)}>
                <Badge badgeContent={cartCount} color="primary">
                  <ShoppingCartCheckout />
                </Badge>
              </IconButton>
            </Box>
            <CustomTabPanel value={value} index={0}>
              <Grid container sx={{ justifyContent: "right" }}>
                <Grid
                  size={{ xs: 12, sm: 4 }}
                  sx={{ display: { xs: "none", sm: "block" } }}
                >
                  <Box sx={{ padding: 2 }}>
                    <Typography gutterBottom>Adjust Card Size</Typography>
                    <Slider
                      value={scale}
                      min={0.5}
                      max={1.5}
                      step={0.01}
                      onChange={handleScaleChange}
                      aria-labelledby="card-size-slider"
                      valueLabelDisplay="auto"
                    />
                  </Box>
                </Grid>
              </Grid>
              {renderProductGrid(magicProducts)}
            </CustomTabPanel>
            <CustomTabPanel value={value} index={1}>
              {renderProductGrid(onepieceProducts)}
            </CustomTabPanel>
            <CustomTabPanel value={value} index={2}>
              {renderProductGrid(unionarenaProducts)}
            </CustomTabPanel>
          </Box>
        </Container>
      </Paper>
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
