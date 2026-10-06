terraform {
  required_version = "~> 1.15.0"

  required_providers {
    stripe = {
      source  = "stripe/stripe"
      version = "0.3.0"
    }
  }

  backend "s3" {
    bucket       = "banghart-terraform-state"
    key          = "homelab/simic-systems-stripe/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

# Reads STRIPE_API_KEY from the environment. Locally: `mise run tf:stripe -- plan`
# exports it from the repo's .env; CI gets it from a repository secret.
provider "stripe" {}
