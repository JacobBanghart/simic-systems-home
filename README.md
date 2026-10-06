# Simic Systems

Trading card storefront at [simic.systems](https://simic.systems), built with Astro 7 and deployed to Cloudflare Workers.

Sells sealed Magic: The Gathering products. Products, prices and shipping rates live in Stripe (managed with Terraform) and are cached in Cloudflare KV. Checkout is a Stripe Checkout session; stock is tracked in product metadata.

## Stack

- **Framework**: Astro 7 (SSR, `@astrojs/cloudflare`) with React 19 islands
- **UI**: Material UI 9 + Tailwind 4, custom dark theme
- **Hosting**: Cloudflare Workers (custom entry `src/worker.ts`: `fetch` + a cron `scheduled` handler)
- **Payments**: Stripe (products, prices, Checkout, webhooks)
- **Caching**: Cloudflare KV (`PRODUCT_CACHE`), refreshed by webhook; also holds webhook/email dedup keys
- **Email**: Cloudflare `send_email` bindings: contact form, order/shipping emails to customers, alerts to the owner
- **Images**: Cloudflare Images binding (injected by the adapter at build) optimizes Stripe-hosted product photos
- **Infra**: Terraform (`terraform/`), tool versions pinned in `mise.toml`
- **Testing**: Vitest; **Linting**: ESLint flat config (TypeScript, React, Astro)

## Project Structure

```
src/
  worker.ts                  # Worker entry: Astro fetch handler + cron (shipped emails)
  middleware.ts              # Security headers / CSP nonce, PostHog
  pages/
    index.astro, play-boosters.astro, collector-boosters.astro   # Storefront + category pages
    product/[slug].astro     # Product detail pages
    api/
      products.ts            # Product listing (KV-cached, last-known-good fallback)
      create-checkout.ts     # Validates cart, reserves stock, creates Checkout session
      webhook.ts             # Stripe webhook (stock, emails, alerts, cache)
      contact.ts             # Contact form handler (rate-limited)
    checkout/                # Success and cancel pages
    about, contact, faq, shipping, privacy, terms, 404, 500, sitemaps
  components/                # React islands (MainPage, ProductCard, CartProvider, CartDrawer, ...) + Astro layout bits
  lib/
    stripeProducts.ts        # Stripe -> ProductData mapping, KV cache + last-good copy
    shipping.ts              # Shipping-rate tiering by subtotal + display copy
    cart.ts, contact.ts, format.ts, productDisplay.ts, optimizeProductImage.ts
    alerts.ts                # Owner alert emails
    email/                   # Order confirmation, shipped emails (cron), carriers, send helper
  types.ts                   # Shared types (ProductData, CartItem)
scripts/                     # predeploy-check, sitemap/wrangler patching, sandbox-order, webhook resend
terraform/
  stripe/                    # Products, prices, shipping rates, webhook endpoint
  cloudflare/                # KV namespaces
  github-ci/                 # AWS OIDC role for the drift-check workflow
tests/                       # Vitest unit tests
```

## Commands

| Command | Action |
|:--|:--|
| `bun install` | Install dependencies (tool versions: `mise install`) |
| `bun run dev` | Start dev server at `localhost:4321` |
| `bun run build` | Production build to `./dist/` |
| `bun run check` | Build, typecheck (`tsc`) and `wrangler deploy --dry-run` (what CI runs) |
| `bun run deploy` | Deploy to Cloudflare Workers, behind the deploy gate (below) |
| `bun run test` | Run Vitest unit tests (not `bun test`) |
| `bun run lint` | Run ESLint (`lint:fix` to autofix) |
| `mise run tf:stripe -- plan` | Preview Stripe catalog changes (`terraform/stripe`) |
| `mise run tf:stripe -- apply` | Apply Stripe catalog changes |
| `bun run webhook:resend` | Resend failed Stripe webhook deliveries (`webhook:resend:dry` to preview) |

### Deploy gate

`bun run deploy` first runs `scripts/predeploy-check.mjs` and refuses to continue unless the working tree is clean (untracked files included), the branch is `main`, `HEAD` equals `origin/main` (after a `git fetch`), and `lint` and `test` pass. Each failure is listed with its reason. Emergency bypass: `DEPLOY_SKIP_CHECKS=1 bun run deploy` (prints a loud warning).

CI (`.github/workflows/ci.yml`) runs lint, tests and `bun run check`, plus `terraform fmt -check` / `init -backend=false` / `validate` for each stack under `terraform/`.

## Cloudflare Bindings

Configured in `wrangler.json`:

| Binding | Type | Purpose |
|:--|:--|:--|
| `ASSETS` | Fetcher | Static asset serving |
| `PRODUCT_CACHE` | KV | Product cache, last-known-good copy, webhook/email dedup keys |
| `CONTACT_EMAIL` | SendEmail | Contact form submissions to contact@simic.systems |
| `ORDER_EMAIL` | SendEmail | Sends from orders@simic.systems: customer emails and owner alerts |
| `IMAGES` | Images | Product image optimization (auto-injected at build; needs Cloudflare Images enabled on the account) |
| cron `*/10 * * * *` | Trigger | Shipped-order emails (`src/worker.ts`) |
| `STRIPE_SECRET_KEY` | Secret | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Secret | Stripe webhook signature verification |
| `ORDER_EMAIL_DEV_TO` | Secret (optional) | Test-mode (`sk_test_`) emails go only here, never to customers |

Secrets are set via `wrangler secret put` or `.dev.vars` for local development. Copy `.dev.vars.example` to `.dev.vars` and `.env.example` to `.env` to get started; see those files for what each variable is for.

## Checkout and Orders

- **Cart validation:** `create-checkout` requires each line's quantity to be an integer from 1 to 10 and merges duplicate lines for the same product before reserving stock.
- **Stock reservation:** stock is reserved when the session is created and released when it expires (`checkout.session.expired`) or an unshipped order is refunded.
- **Abandoned sessions:** a shopper's previous open checkout session is cancelled when they start a new one or land on `/checkout/cancel`, releasing its stock immediately instead of waiting for expiry.
- **Refunds:** a full refund restocks only if the order has no `tracking_number` (it never shipped). Refunds of shipped orders are not restocked automatically.
- **Async payments:** the webhook also handles `checkout.session.async_payment_succeeded` / `async_payment_failed` for delayed payment methods.
- **Emails:** the webhook sends the order confirmation (deduped per session); the cron sends shipping emails.
- **Owner alerts:** emails to contact@simic.systems (`src/lib/alerts.ts`) for new orders, disputes, partial refunds, refunds needing a manual stock review, and email/cron failures. In test mode they go to `ORDER_EMAIL_DEV_TO` or nowhere.
- **Product list resilience:** `/api/products` reads the 60s KV cache, then Stripe; if Stripe is unreachable it serves the last-known-good KV copy (kept 7 days). Checkout always re-checks live stock and prices.

## Stripe Catalog Management

Products, prices and shipping rates are managed with Terraform in `terraform/stripe/` (official `stripe/stripe` provider; state in S3). Tool versions are pinned in `mise.toml`; `mise run tf:stripe -- <args>` runs Terraform there with `STRIPE_API_KEY` taken from `.env`.

```bash
mise run tf:stripe -- plan    # preview
mise run tf:stripe -- apply   # apply
```

- **Prices:** edit `unit_amount` (cents). Terraform creates the new price, moves the `lookup_key` (= the product's `catalogKey`) to it, and archives the old one. The storefront resolves prices by lookup key; products deliberately have no `default_price`.
- **Stock:** `metadata.quantity` is ignored by Terraform. Checkout reserves stock and the webhook releases it on expiry/refund; set restocks in the Stripe dashboard.
- **New products:** add a `stripe_product` + `stripe_price` pair (see existing ones). `tests/terraform-catalog.test.ts` requires every active product to have a GTIN and a unique slug.
- **Shipping:** rates carry `min_subtotal_cents` / `max_subtotal_cents` metadata; checkout only offers the rates that bracket the cart subtotal (currently $8 under $250, $15 with signature confirmation at $250+).
- **Sandbox:** the same config is applied to the Stripe sandbox as Terraform workspace `sandbox` (`mise run tf:stripe-sandbox -- apply`, test key from Vault `secret/simic-systems/stripe-test`), so local testing uses an identical catalog. Apply to both after catalog changes.
- **Shipping emails:** add `tracking_number` (and optionally `carrier`) metadata to a payment in the dashboard; a cron (every 10 min, `src/worker.ts` → `src/lib/email/shipments.ts`) emails the customer and records `shipped_email_tracking`. Dashboard metadata edits emit no webhook, hence the cron.
- **Drift:** `.github/workflows/stripe-drift.yml` runs `terraform plan` daily and keeps one `stripe-drift` issue up to date (closed automatically when the plan is clean) if Stripe was changed outside Terraform or Terraform changes are committed but unapplied; a failing check opens a "Stripe drift check failing" issue instead. Don't edit products/prices/shipping rates in the dashboard (except stock).
- The storefront cache refreshes within ~60 seconds after Stripe changes via webhook. Every event the webhook handles must also be listed in `terraform/stripe/webhook.tf`.
