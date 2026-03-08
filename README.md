# Astro Starter Kit: Blog

![Astro Template Preview](https://github.com/withastro/astro/assets/2244813/ff10799f-a816-4703-b967-c78997e8323d)

<!-- dash-content-start -->

Create a blog with Astro and deploy it on Cloudflare Workers as a [static website](https://developers.cloudflare.com/workers/static-assets/).

Features:

- ✅ Minimal styling (make it your own!)
- ✅ 100/100 Lighthouse performance
- ✅ SEO-friendly with canonical URLs and OpenGraph data
- ✅ Sitemap support
- ✅ RSS Feed support
- ✅ Markdown & MDX support

<!-- dash-content-end -->

## Getting Started

Outside of this repo, you can start a new project with this template using [C3](https://developers.cloudflare.com/pages/get-started/c3/) (the `create-cloudflare` CLI):

```bash
npm create cloudflare@latest -- --template=cloudflare/templates/simic-systems-home
```

A live public deployment of this template is available at [https://simic-systems-home.templates.workers.dev](https://simic-systems-home.templates.workers.dev)

## 🚀 Project Structure

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

The `src/content/` directory contains "collections" of related Markdown and MDX documents. Use `getCollection()` to retrieve posts from `src/content/blog/`, and type-check your frontmatter using an optional schema. See [Astro's Content Collections docs](https://docs.astro.build/en/guides/content-collections/) to learn more.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run catalog:plan`    | Preview Stripe catalog changes from `catalog/products.mjs` |
| `npm run catalog:pull`    | Pull current Stripe products into `catalog/products.mjs` |
| `npm run catalog:sync`    | Apply catalog changes to Stripe                  |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |
| `npm run deploy`          | Deploy your production site to Cloudflare        |

## Stripe Catalog Management

This project can manage storefront products from a single repo file instead of editing each product manually in Stripe.

Edit [catalog/products.mjs](catalog/products.mjs) to control:

- product name and description
- price in cents
- product image URL
- category metadata
- display order in the storefront
- active or hidden status
- optional stock quantity

Then run:

```bash
npm run catalog:pull
npm run catalog:plan
npm run catalog:sync
```

Notes:

- `npm run catalog:pull` is the easiest bootstrap path if you already have products in Stripe.
- The sync script uses `STRIPE_SECRET_KEY` from your shell or `.dev.vars`.
- Price changes create a new Stripe price and swap the product's default price, which is the correct Stripe workflow.
- If `quantity` is omitted for a product, the current Stripe stock metadata is preserved.
- Managed products removed from the catalog file are archived in Stripe the next time you sync.
- Storefront cache now refreshes within about 60 seconds after Stripe changes.

## 👀 Want to learn more?

Check out [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Credit

This theme is based off of the lovely [Bear Blog](https://github.com/HermanMartinus/bearblog/).
