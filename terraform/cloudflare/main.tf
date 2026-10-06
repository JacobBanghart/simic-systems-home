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
