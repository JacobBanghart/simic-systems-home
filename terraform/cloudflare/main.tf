# Cloudflare resources for the storefront Worker. State moved from R2
# (simic-systems-tfstate) to the shared S3 bucket on 2026-10-05; the R2 copy
# is a stale backup. Run via `mise run tf:cloudflare -- <cmd>`, which reads the
# API token from Vault (secret/simic-systems/cloudflare).
terraform {
  required_version = "~> 1.15.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket       = "banghart-terraform-state"
    key          = "homelab/simic-systems-cloudflare/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

resource "cloudflare_workers_kv_namespace" "product_cache" {
  account_id = var.cloudflare_account_id
  title      = "simic-systems-product-cache"
}

resource "cloudflare_workers_kv_namespace" "product_cache_preview" {
  account_id = var.cloudflare_account_id
  title      = "simic-systems-product-cache-preview"
}

output "kv_namespace_id" {
  description = "Production KV namespace ID for wrangler.json"
  value       = cloudflare_workers_kv_namespace.product_cache.id
}

output "kv_namespace_preview_id" {
  description = "Preview KV namespace ID for wrangler.json"
  value       = cloudflare_workers_kv_namespace.product_cache_preview.id
}

# Bot check on the contact form. The site key is public (rendered into the
# page); the secret goes to the Worker as TURNSTILE_SECRET_KEY:
#   mise run tf:cloudflare -- output -raw turnstile_secret_key | bunx wrangler secret put TURNSTILE_SECRET_KEY
resource "cloudflare_turnstile_widget" "contact_form" {
  account_id = var.cloudflare_account_id
  name       = "simic.systems contact form"
  domains    = ["simic.systems"]
  mode       = "managed"
}

output "turnstile_site_key" {
  description = "Turnstile site key (public) for the contact form"
  value       = cloudflare_turnstile_widget.contact_form.sitekey
}

output "turnstile_secret_key" {
  description = "Turnstile secret for the Worker (TURNSTILE_SECRET_KEY)"
  value       = cloudflare_turnstile_widget.contact_form.secret
  sensitive   = true
}
