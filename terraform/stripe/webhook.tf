# Every event src/pages/api/webhook.ts handles must be listed here. Missing
# checkout.session.expired (until 2026-10-05) silently leaked stock on every
# abandoned checkout, because reservations were never released.
#
# Replacing this resource rotates the signing secret and breaks
# STRIPE_WEBHOOK_SECRET in the Worker. api_version and connect force
# replacement, so leave them alone; if a plan ever says "must be replaced",
# stop and plan the secret rotation first.
resource "stripe_webhook_endpoint" "storefront" {
  url         = "https://simic.systems/api/webhook/"
  description = "Simic Systems LLC Endpoint"
  api_version = "2025-11-17.clover"

  enabled_events = [
    "checkout.session.completed",
    "product.created",
    "product.deleted",
    "product.updated",
    "price.created",
    "price.deleted",
    "price.updated",
    "checkout.session.expired",
    "charge.refunded",
    "charge.dispute.created",
  ]

  lifecycle {
    prevent_destroy = true
  }
}
