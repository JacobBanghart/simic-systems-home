# Simic Systems Storefront - Feature Roadmap

This document tracks features for the simic.systems storefront. Completed items are checked off.

---

## Priority 1: Core E-commerce Features (Done)

- [x] **1.1 Individual Product Pages** — Dynamic `/product/[id]/` routes with Product schema.org, OG tags, full description, add-to-cart
- [x] **1.2 Product Search** — Client-side search by name and description, clear button, works with sort and filters
- [x] **1.3 Category Filtering** — Toggle buttons (All, Magic, One Piece, Union Arena), chains with search and sort
- [x] **1.4 Product Card Descriptions** — Truncated 2-line descriptions on cards via CSS line-clamp

## Priority 2: Trust & Conversion (Done)

- [x] **2.1 Contact Form** — React form with validation, honeypot spam prevention, emailed via Cloudflare send_email
- [x] **2.2 Trust Badges** — Secure checkout lock icon, payment method labels, Powered by Stripe badge
- [x] **2.3 FAQ Page** — 8 questions with accordion UI, FAQPage schema.org, linked in header and footer

## Technical Debt (Done)

- [x] **T.1** Fix webhook silent failure — returns 500 on inventory update error
- [x] **T.2** ESLint + Prettier — flat config with TypeScript, React hooks, Astro plugins
- [x] **T.3** Remove `as any` casts — all API routes use typed `locals.runtime`
- [x] **T.4** Cart localStorage validation — type guard + graceful fallback
- [x] **T.5** Dependency vulnerabilities — resolved to 0 via npm overrides
- [x] **T.6** Shared `formatPrice` — extracted to `src/lib/format.ts`
- [x] **T.7** Custom 404 page — branded page with back-to-store link
- [x] **T.8** Vitest test framework — 11 tests (formatPrice + cart validation)
- [x] **T.9** Loading states audit — cart clears on checkout success

---

## Notes for Implementation

### Development Workflow
```bash
npm run dev          # Start local dev server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run test         # Run Vitest
npm run check        # Type check + build + dry-run deploy
npm run deploy       # Build and deploy to Cloudflare
```

### Key Files
| File | Purpose |
|------|---------|
| `src/pages/index.astro` | Homepage / store |
| `src/pages/product/[id].astro` | Product detail page |
| `src/pages/faq.astro` | FAQ page |
| `src/pages/api/contact.ts` | Contact form endpoint |
| `src/components/MainPage.tsx` | Product grid, search, filters, sorting |
| `src/components/ProductCard.tsx` | Individual product card |
| `src/components/ProductDetail.tsx` | Product detail view |
| `src/components/CartProvider.tsx` | Cart state management |
| `src/components/CartDrawer.tsx` | Cart UI |
| `src/components/ContactForm.tsx` | Contact form |
| `src/lib/stripeProducts.ts` | Stripe product fetching |
| `src/lib/format.ts` | Shared formatting utilities |
| `src/types.ts` | TypeScript types |
| `src/components/BaseHead.astro` | SEO meta tags |

### Testing Checklist
Before deploying any feature:
- [ ] Works on mobile viewport
- [ ] Works on desktop viewport
- [ ] No TypeScript errors (`npm run check`)
- [ ] No lint errors (`npm run lint`)
- [ ] Tests pass (`npm run test`)
- [ ] No console errors in browser
- [ ] Cart still functions correctly
- [ ] Checkout still functions correctly
