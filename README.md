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
catalog/
  products.mjs               # Declarative product catalog (syncs to Stripe)
scripts/
  catalog-sync.mjs           # Stripe catalog sync tooling
tests/                       # Vitest unit tests
```

## Commands

| Command | Action |
|:--|:--|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server at `localhost:4321` |
| `npm run build` | Production build to `./dist/` |
| `npm run deploy` | Deploy to Cloudflare Workers |
| `npm run catalog:pull` | Pull current Stripe products into `catalog/products.mjs` |
| `npm run catalog:plan` | Preview catalog changes (diff against Stripe) |
| `npm run catalog:sync` | Apply catalog changes to Stripe |
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

Secrets are set via `wrangler secret put` or `.dev.vars` for local development.

## Stripe Catalog Management

Products can be managed declaratively from `catalog/products.mjs` instead of editing each product in the Stripe dashboard.

```bash
# Bootstrap from existing Stripe products
npm run catalog:pull

# Preview what would change
npm run catalog:plan

# Apply changes to Stripe
npm run catalog:sync
```

- Price changes create a new Stripe price and swap the default (correct Stripe workflow).
- Omitting `quantity` preserves the current Stripe stock metadata.
- Products removed from the catalog file are archived in Stripe on next sync.
- The storefront cache refreshes within ~60 seconds after Stripe changes via webhook.
