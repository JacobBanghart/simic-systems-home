# Checkout only offers the rates whose min/max_subtotal_cents bracket the cart
# subtotal (src/lib/shipping.ts). Keep the two thresholds equal so every cart
# gets exactly one option.
locals {
  signature_threshold_cents = "25000"
}

resource "stripe_shipping_rate" "standard" {
  display_name = "UPS/USPS Ground"
  tax_code     = "txcd_92010001"
  tax_behavior = "unspecified"

  fixed_amount {
    amount   = 800
    currency = "usd"
  }

  metadata = {
    max_subtotal_cents = local.signature_threshold_cents
  }
}

resource "stripe_shipping_rate" "signature" {
  display_name = "Ground Advantage Signature Confirmation"
  tax_code     = "txcd_92010001"
  tax_behavior = "unspecified"

  fixed_amount {
    amount   = 1500
    currency = "usd"
  }

  metadata = {
    min_subtotal_cents = local.signature_threshold_cents
  }
}
