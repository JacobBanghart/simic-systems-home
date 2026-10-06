# GitHub Actions -> AWS via OIDC, so CI holds no long-lived AWS keys.
# Currently one consumer: the scheduled Stripe drift check
# (.github/workflows/stripe-drift.yml), which only needs to READ the
# terraform/stripe state. It plans with -lock=false, so no write access.
#
# The OIDC provider is account-wide (one per issuer per account); if another
# repo needs GitHub OIDC, reference this provider rather than creating another.

terraform {
  required_version = "~> 1.15.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  backend "s3" {
    bucket       = "banghart-terraform-state"
    key          = "homelab/simic-systems-github-ci/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = "us-east-1"
}

locals {
  repo         = "JacobBanghart/simic-systems-home"
  state_bucket = "banghart-terraform-state"
  stripe_state = "homelab/simic-systems-stripe/"
}

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_policy_document" "trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # main only: the repo is public, so pull_request runs (incl. forks) must
    # never be able to assume this role.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${local.repo}:ref:refs/heads/main"]
    }
  }
}

data "aws_iam_policy_document" "read_stripe_state" {
  statement {
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::${local.state_bucket}"]

    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["${local.stripe_state}*"]
    }
  }

  statement {
    actions   = ["s3:GetObject"]
    resources = ["arn:aws:s3:::${local.state_bucket}/${local.stripe_state}*"]
  }
}

resource "aws_iam_role" "stripe_drift" {
  name                 = "github-simic-stripe-drift"
  assume_role_policy   = data.aws_iam_policy_document.trust.json
  max_session_duration = 3600
}

resource "aws_iam_role_policy" "stripe_drift" {
  name   = "read-stripe-tfstate"
  role   = aws_iam_role.stripe_drift.id
  policy = data.aws_iam_policy_document.read_stripe_state.json
}

output "stripe_drift_role_arn" {
  value = aws_iam_role.stripe_drift.arn
}
