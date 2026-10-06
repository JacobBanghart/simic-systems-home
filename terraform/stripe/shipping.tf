# Checkout only offers the rates whose min/max_subtotal_cents bracket the cart
# subtotal (src/lib/shipping.ts). Keep the two thresholds equal so every cart
# gets exactly one option.
#
# create_before_destroy: changing an amount or name replaces the rate, and
# without it there is a window where the old rate is archived and the new one
# doesn't exist yet (checkout refuses carts with no matching rate).
locals {
  signature_threshold_cents = "25000"
}

resource "stripe_shipping_rate" "standard" {
  display_name = "UPS/USPS Ground"
  tax_code     = "txcd_92010001"
  tax_behavior = "unspecified"
  type         = "fixed_amount"

  fixed_amount {
    amount   = 800
    currency = "usd"
  }

  metadata = {
    max_subtotal_cents = local.signature_threshold_cents
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "stripe_shipping_rate" "signature" {
  display_name = "Ground Advantage Signature Confirmation"
  tax_code     = "txcd_92010001"
  tax_behavior = "unspecified"
  type         = "fixed_amount"

  fixed_amount {
    amount   = 1500
    currency = "usd"
  }

  metadata = {
    min_subtotal_cents = local.signature_threshold_cents
  }

  lifecycle {
    create_before_destroy = true
  }
}
