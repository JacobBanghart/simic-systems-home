import { IconButton, Badge } from "@mui/material";
import { ShoppingCartCheckout } from "@mui/icons-material";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useCart } from "./CartProvider";
import { CartDrawer } from "./CartDrawer";

export function CartButton() {
  const [cartOpen, setCartOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const { cartCount } = useCart();

  useEffect(() => {
    const el = document.getElementById("cart-button-portal");
    if (el) {
      const placeholder = el.querySelector(".cart-placeholder");
      if (placeholder) {
        (placeholder as HTMLElement).style.display = "none";
      }
      setPortalTarget(el);
    }
  }, []);

  const button = (
    <>
      <IconButton onClick={() => setCartOpen(true)} aria-label="Open shopping cart">
        <Badge
          badgeContent={cartCount}
          color="error"
          sx={{
            "& .MuiBadge-badge": {
              fontSize: "0.7rem",
              minWidth: 18,
              height: 18,
            },
          }}
        >
          <ShoppingCartCheckout />
        </Badge>
      </IconButton>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );

  if (portalTarget) {
    return createPortal(button, portalTarget);
  }

  return null;
}
