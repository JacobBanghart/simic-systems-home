import { useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Divider,
  List,
  ListItem,
  Alert,
} from "@mui/material";
import { Add, Remove, Delete, Close } from "@mui/icons-material";
import { useCart } from "./CartProvider";
import { formatPrice } from "../lib/format";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { cartItems, removeFromCart, updateQuantity, clearCart, cartTotal } =
    useCart();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            priceId: item.priceId,
            quantity: item.quantity,
          })),
        }),
      });
      const data: { url?: string; error?: string } = await res.json();
      if (!res.ok) {
        setError(data.error || "Checkout failed");
        return;
      }
      window.location.href = data.url!;
    } catch {
      setError("Failed to connect to checkout service");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: "85vw", sm: 400 }, p: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6">Cart</Typography>
          <IconButton onClick={onClose} aria-label="Close cart">
            <Close />
          </IconButton>
        </Box>
        <Divider />

        {cartItems.length === 0 ? (
          <Typography sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
            Your cart is empty
          </Typography>
        ) : (
          <>
            <List>
              {cartItems.map((item) => (
                <ListItem
                  key={item.productId}
                  sx={{
                    display: "flex",
                    gap: 2,
                    alignItems: "center",
                    px: 0,
                  }}
                >
                  <Box
                    component="img"
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    width={60}
                    height={60}
                    sx={{
                      width: 60,
                      height: 60,
                      objectFit: "contain",
                      borderRadius: 1,
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: "bold",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatPrice(item.price)} each
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => removeFromCart(item.productId)}
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        <Remove fontSize="small" />
                      </IconButton>
                      <Typography variant="body2">{item.quantity}</Typography>
                      <IconButton
                        size="small"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity + 1)
                        }
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        <Add fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                      {formatPrice(item.price * item.quantity)}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => updateQuantity(item.productId, 0)}
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography variant="h6">Total</Typography>
              <Typography variant="h6">{formatPrice(cartTotal)}</Typography>
            </Box>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Button
              variant="contained"
              fullWidth
              onClick={handleCheckout}
              disabled={checkoutLoading}
              sx={{ mb: 1 }}
            >
              {checkoutLoading ? "Redirecting..." : "Checkout"}
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={clearCart}
              color="secondary"
            >
              Clear Cart
            </Button>
          </>
        )}
      </Box>
    </Drawer>
  );
}
