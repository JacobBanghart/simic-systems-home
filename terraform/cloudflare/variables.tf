variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
  default     = "c510d9e65a83d7d2a56bb3937019c028"
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token with Workers KV permissions"
  type        = string
  sensitive   = true
}
