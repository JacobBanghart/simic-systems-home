import { useState, useEffect } from "react";
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
import Add from "@mui/icons-material/Add";
import Remove from "@mui/icons-material/Remove";
import Delete from "@mui/icons-material/Delete";
import Close from "@mui/icons-material/Close";
import { useCart } from "./CartProvider";
import { formatPrice } from "../lib/format";
import { describeCartChange, maxQuantityFor, toCheckoutItems } from "../lib/cart";
import { estimatedShippingCents, SIGNATURE_THRESHOLD_CENTS } from "../lib/shipping";
import { getPostHog, getPostHogHeaders } from "../lib/posthog-client";

const CHECKOUT_SESSION_KEY = "simic-checkout-session";

function readStoredSessionId(): string | undefined {
  try {
    return localStorage.getItem(CHECKOUT_SESSION_KEY) || undefined;
  } catch {
    return undefined;
  }
}

function storeSessionId(sessionId: string) {
  try {
    localStorage.setItem(CHECKOUT_SESSION_KEY, sessionId);
  } catch {
    // Private mode / quota: losing the handoff only means the old session expires on its own.
  }
}

function clearStoredSessionId() {
  try {
    localStorage.removeItem(CHECKOUT_SESSION_KEY);
  } catch {
    // ignore
  }
}

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    cartNotices,
    dismissCartNotices,
    refreshCart,
  } = useCart();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Prices and stock can change while a cart sits in localStorage.
    void refreshCart();
    getPostHog()?.capture("cart_viewed", {
      item_count: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      cart_total_cents: cartTotal,
    });
    // Fire once per drawer-open transition, not on every cart mutation while open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCheckout = async () => {
    const items = toCheckoutItems(cartItems);
    if (items.length === 0) return;
    setCheckoutLoading(true);
    setError(null);
    try {
      getPostHog()?.capture("cart_checkout_started", {
        item_count: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        cart_total_cents: cartTotal,
        products: cartItems.map((item) => ({
          slug: item.productId,
          name: item.name,
          quantity: item.quantity,
        })),
      });

      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getPostHogHeaders(),
        },
        body: JSON.stringify({
          items,
          previousSessionId: readStoredSessionId(),
        }),
      });
      const data: { url?: string; sessionId?: string; error?: string } = await res.json();
      if (!res.ok) {
        setError(data.error || "Checkout failed");
        getPostHog()?.capture("checkout_error", {
          reason: data.error || "unknown",
          source: "api_response",
        });
        if (/available/i.test(data.error ?? "")) {
          // The server already released any previous session we sent, so the
          // stored id is spent; dropping it lets the re-sync below trust the
          // stock it sees. Stale price or stock: the drawer shows what changed.
          clearStoredSessionId();
          await refreshCart();
        }
        return;
      }
      if (data.sessionId) storeSessionId(data.sessionId);
      window.location.href = data.url!;
    } catch (err) {
      setError("Failed to connect to checkout service");
      getPostHog()?.capture("checkout_error", {
        reason: err instanceof Error ? err.message : "network_error",
        source: "exception",
      });
      getPostHog()?.captureException(err);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const estimatedShipping = estimatedShippingCents(cartTotal);

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

        {cartNotices.length > 0 && (
          <Alert severity="info" onClose={dismissCartNotices} sx={{ mt: 2 }}>
            {cartNotices.map((change, i) => (
              <Typography key={i} variant="body2">
                {describeCartChange(change)}
              </Typography>
            ))}
          </Alert>
        )}

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
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= maxQuantityFor(item)}
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
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="body2">Subtotal</Typography>
              <Typography variant="body2">{formatPrice(cartTotal)}</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Box>
                <Typography variant="body2">Estimated shipping</Typography>
                {cartTotal >= SIGNATURE_THRESHOLD_CENTS && (
                  <Typography variant="caption" color="text.secondary">
                    includes signature confirmation
                  </Typography>
                )}
              </Box>
              <Typography variant="body2">{formatPrice(estimatedShipping)}</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
              <Typography variant="h6">Estimated total</Typography>
              <Typography variant="h6">{formatPrice(cartTotal + estimatedShipping)}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
              Tax calculated at checkout.
            </Typography>
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
            <Button variant="outlined" fullWidth onClick={clearCart} color="secondary">
              Clear Cart
            </Button>
          </>
        )}
      </Box>
    </Drawer>
  );
}
