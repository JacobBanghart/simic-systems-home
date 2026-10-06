# Simic Systems

Trading card storefront at [simic.systems](https://simic.systems), built with Astro 5 and deployed to Cloudflare Workers.

Sells sealed products for Magic: The Gathering, One Piece, and Union Arena. Products are managed in Stripe and cached via Cloudflare KV. Checkout is handled by Stripe Checkout sessions.

## Stack

- **Framework**: Astro 5 (SSR) with React islands
- **UI**: Material UI 7 with a custom dark theme
- **Hosting**: Cloudflare Workers
- **Payments**: Stripe (products, prices, checkout, webhooks)
- **Caching**: Cloudflare KV (`PRODUCT_CACHE`) with webhook-driven invalidation
- **Email**: Cloudflare `send_email` binding for contact form submissions
- **Testing**: Vitest (66 unit tests)
- **Linting**: ESLint flat config with TypeScript, React, and Astro plugins

## Project Structure

```
src/
  pages/
    index.astro              # Store homepage (product grid, search, filters)
    product/[id].astro       # Individual product detail pages
    api/
      products.ts            # Product listing endpoint (KV-cached)
      create-checkout.ts     # Stripe Checkout session creation
      webhook.ts             # Stripe webhook (cache invalidation)
      contact.ts             # Contact form handler (rate-limited)
    checkout/                # Success and cancel pages
    about.astro, contact.astro, faq.astro, shipping.astro,
    privacy.astro, terms.astro, 404.astro
  components/
    MainPage.tsx             # Product grid with search + category filters
    ProductCard.tsx          # Product card in grid
    ProductDetail.tsx        # Full product detail view
    CartProvider.tsx         # React context for shopping cart
    CartDrawer.tsx           # Slide-out cart drawer
    ContactForm.tsx          # Contact form with honeypot + rate limiting
    ErrorBoundary.tsx        # React error boundary
    Header.astro, Footer.astro, BaseHead.astro
    theme.tsx                # MUI dark theme config
  lib/
    cart.ts                  # Pure cart operations (add, remove, totals)
    contact.ts               # Contact validation + email builder
    stripeProducts.ts        # Stripe product mapping + category validation
    format.ts                # Price formatting
  types.ts                   # Shared types (ProductData, CartItem)
terraform/
  stripe/                    # Stripe products, prices, shipping rates (Terraform)
  github-ci/                 # AWS OIDC role for the drift-check workflow
  cloudflare/                # Cloudflare KV namespaces (`mise run tf:cloudflare`)
tests/                       # Vitest unit tests
```

## Commands

| Command | Action |
|:--|:--|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server at `localhost:4321` |
| `npm run build` | Production build to `./dist/` |
| `npm run deploy` | Deploy to Cloudflare Workers |
| `mise run tf:stripe -- plan` | Preview Stripe catalog changes (`terraform/stripe`) |
| `mise run tf:stripe -- apply` | Apply Stripe catalog changes |
| `npm test` | Run Vitest unit tests |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |

## Cloudflare Bindings

Configured in `wrangler.json`:

| Binding | Type | Purpose |
|:--|:--|:--|
| `ASSETS` | Fetcher | Static asset serving |
| `PRODUCT_CACHE` | KV | Cached product data from Stripe |
| `STRIPE_SECRET_KEY` | Secret | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Secret | Stripe webhook signature verification |
| `CONTACT_EMAIL` | SendEmail | Forwards contact form submissions |

Secrets are set via `wrangler secret put` or `.dev.vars` for local development. Copy `.dev.vars.example` to `.dev.vars` and `.env.example` to `.env` to get started — see those files for what each variable is for.

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
- **Drift:** `.github/workflows/stripe-drift.yml` runs `terraform plan` daily and opens a `stripe-drift` issue if Stripe was changed outside Terraform. Don't edit products/prices/shipping rates in the dashboard (except stock).
- The storefront cache refreshes within ~60 seconds after Stripe changes via webhook.
