terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  required_version = ">= 1.0"

  backend "s3" {
    bucket = "simic-systems-tfstate"
    key    = "terraform.tfstate"

    # Cloudflare R2 S3-compatible endpoint
    # Replace <ACCOUNT_ID> with your Cloudflare account ID
    endpoints = {
      s3 = "https://c510d9e65a83d7d2a56bb3937019c028.r2.cloudflarestorage.com"
    }
    region = "us-east-1"  # R2 ignores this, but Terraform requires a valid AWS region

    # R2 doesn't support these S3 features
    skip_credentials_validation = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true

    # Auth via AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY env vars
    # (generated from R2 API token in Cloudflare Dashboard)
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
