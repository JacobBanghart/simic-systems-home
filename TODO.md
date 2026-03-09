# Simic Systems Storefront - Feature Roadmap

This document outlines features to implement for the simic.systems storefront. Each task includes context, acceptance criteria, and implementation hints.

---

## Priority 1: Core E-commerce Features

### 1.1 Individual Product Pages

**Why:** Users can't share links to specific products, and search engines can't index individual items. This hurts SEO and social sharing.

**Current state:** All products display only on the homepage grid. No `/product/[slug]` routes exist.

**Requirements:**
- Create dynamic route at `src/pages/product/[id].astro`
- Page should display:
  - Product image (larger than card view)
  - Product name
  - Price
  - Full description (currently hidden on cards)
  - Stock status
  - Add to cart button
  - Back to store link
- Add Product schema.org structured data for SEO
- Add Open Graph meta tags so links preview nicely when shared

**Technical hints:**
- Look at how `src/pages/index.astro` fetches products via `fetchStoreProducts()`
- Use the product `id` (Stripe product ID) as the URL parameter
- Reference `src/components/BaseHead.astro` for meta tag patterns
- Product data type is defined in `src/types.ts` as `ProductData`

**Acceptance criteria:**
- [ ] Visiting `/product/prod_xxx/` shows that product's detail page
- [ ] Page has proper meta title: "[Product Name] | Simic Systems"
- [ ] Page has og:image set to the product image
- [ ] Page has Product schema.org JSON-LD
- [ ] Add to cart works and updates cart state
- [ ] Out of stock products show disabled button
- [ ] 404 displayed for invalid product IDs

---

### 1.2 Product Search

**Why:** As inventory grows, users need to quickly find specific sets or products.

**Current state:** No search functionality exists.

**Requirements:**
- Add search input to the store page header area
- Filter products client-side as user types
- Search should match against product name and description
- Show "No results" message when nothing matches
- Clear search button

**Technical hints:**
- Implement in `src/components/MainPage.tsx` since it already manages product state
- Use controlled input with `useState` for search query
- Filter the products array before rendering
- Consider debouncing the search input (optional for small catalog)

**Acceptance criteria:**
- [ ] Search input visible on store page
- [ ] Typing filters products in real-time
- [ ] Searches product names (case-insensitive)
- [ ] Searches product descriptions (case-insensitive)
- [ ] "No products found" shown when no matches
- [ ] Clearing search shows all products again
- [ ] Search works alongside existing sort dropdown

---

### 1.3 Category Filtering

**Why:** Products have categories (`magic`, `onepiece`, `unionarena`) but users can't filter by them.

**Current state:** Category data exists in `ProductData.category` but no filter UI.

**Requirements:**
- Add filter buttons/tabs above product grid: "All", "Magic", "One Piece", "Union Arena"
- Clicking a category shows only products in that category
- "All" shows everything
- Active category should be visually highlighted
- Should work alongside search and sort

**Technical hints:**
- Add to `src/components/MainPage.tsx`
- Use `useState` for selected category
- Chain filters: category filter → search filter → sort
- Category values are lowercase: `"magic"`, `"onepiece"`, `"unionarena"`

**Acceptance criteria:**
- [ ] Category filter buttons displayed above product grid
- [ ] Clicking category filters products to that category only
- [ ] "All" button shows all products
- [ ] Active category button is visually distinct
- [ ] Combining category filter with search works correctly
- [ ] Combining category filter with sort works correctly
- [ ] URL does not need to update (client-side only is fine)

---

### 1.4 Display Product Descriptions on Cards

**Why:** Product descriptions exist in Stripe but aren't shown to users on the product cards.

**Current state:** `ProductCard.tsx` receives description data but doesn't render it.

**Requirements:**
- Show truncated description (2-3 lines) on each product card
- Add "..." or fade effect for overflow
- Full description visible on product detail page (see 1.1)

**Technical hints:**
- Edit `src/components/ProductCard.tsx`
- Use CSS `line-clamp` for truncation: `line-clamp: 3`
- Description is already in the `product` prop

**Acceptance criteria:**
- [ ] Product cards show truncated description
- [ ] Long descriptions truncate gracefully (no layout breakage)
- [ ] Empty descriptions don't show awkward empty space

---

## Priority 2: Trust & Conversion

### 2.1 Contact Form

**Why:** Email links have lower conversion than forms. Forms feel more professional and capture inquiries reliably.

**Current state:** Contact page (`src/pages/contact.astro`) only shows an email link.

**Requirements:**
- Add contact form with fields: Name, Email, Subject (dropdown), Message
- Subject options: "Order Question", "Product Inquiry", "Returns/Refunds", "Other"
- Form submits to an API endpoint
- Show success/error message after submission
- Basic spam prevention (honeypot field)

**Technical hints:**
- Create `src/pages/api/contact.ts` for form handling
- Options for email delivery:
  - Cloudflare Email Workers
  - Forward to external service (Formspree, etc.)
  - Store in KV and notify via webhook
- Use React component for form interactivity

**Acceptance criteria:**
- [ ] Contact form renders on `/contact/`
- [ ] All fields validate (required, email format)
- [ ] Form submission hits API endpoint
- [ ] Success message shown on submit
- [ ] Error message shown on failure
- [ ] Honeypot field prevents basic spam bots
- [ ] Form clears after successful submission

---

### 2.2 Trust Badges in Footer

**Why:** Payment icons and security messaging increase checkout confidence.

**Current state:** Footer exists (`src/components/Footer.astro`) but has no trust signals.

**Requirements:**
- Add "Secure Checkout" text with lock icon
- Add payment method icons: Visa, Mastercard, Amex, Apple Pay, Google Pay
- Add "Powered by Stripe" badge (Stripe provides official assets)
- Keep footer clean and not cluttered

**Technical hints:**
- Stripe brand assets: https://stripe.com/newsroom/brand-assets
- Use SVG icons for payment methods (many free icon sets available)
- Edit `src/components/Footer.astro`

**Acceptance criteria:**
- [ ] Footer shows payment method icons
- [ ] Footer shows "Secure Checkout" with lock icon
- [ ] Footer shows Stripe badge
- [ ] Icons are appropriately sized and aligned
- [ ] Footer doesn't look cluttered

---

### 2.3 FAQ Page

**Why:** Reduces support emails and answers common questions upfront.

**Current state:** No FAQ page exists.

**Requirements:**
- Create `/faq/` page
- Include common questions:
  - What payment methods do you accept?
  - Do you ship internationally?
  - How long does shipping take?
  - What is your return policy?
  - Are products sealed/authentic?
  - How do I track my order?
  - Do you offer bulk/wholesale pricing?
- Use accordion/collapsible UI for questions
- Add FAQPage schema.org structured data for SEO

**Technical hints:**
- Create `src/pages/faq.astro`
- Reference shipping/returns info from `src/pages/shipping.astro` for consistency
- Schema.org FAQPage: https://schema.org/FAQPage

**Acceptance criteria:**
- [ ] FAQ page accessible at `/faq/`
- [ ] At least 6-8 questions answered
- [ ] Questions expand/collapse on click
- [ ] FAQPage schema.org JSON-LD included
- [ ] Page linked from header or footer navigation
- [ ] Answers are accurate to current policies

---

## Priority 3: Growth Features

### 3.1 Newsletter Signup

**Why:** Build an email list for restock notifications, new releases, and promotions.

**Current state:** No email capture exists.

**Requirements:**
- Add email signup form to footer
- Simple: just email field + submit button
- "Get notified about restocks and new releases"
- Store emails for later use (KV, external service, or just log)
- Show success message after signup

**Technical hints:**
- Options for email storage:
  - Cloudflare KV (simple, built-in)
  - Mailchimp/ConvertKit API
  - Buttondown, Loops, or other newsletter service
- Create `src/pages/api/newsletter.ts` endpoint

**Acceptance criteria:**
- [ ] Email signup form in footer
- [ ] Email validation (format check)
- [ ] Duplicate email handling (don't error, just succeed)
- [ ] Success message shown
- [ ] Emails stored/forwarded somewhere retrievable

---

### 3.2 Shipping Calculator

**Why:** Users want to know shipping cost before starting checkout.

**Current state:** Shipping cost only shown at Stripe checkout.

**Requirements:**
- Add "Estimate Shipping" section to cart drawer
- Input for ZIP code
- Button to calculate
- Display estimated shipping cost
- Note that final cost calculated at checkout

**Technical hints:**
- Create API endpoint that calls Stripe Shipping Rate API
- Or hardcode USPS rate estimates based on zones
- Cart drawer is in `src/components/CartDrawer.tsx`

**Acceptance criteria:**
- [ ] ZIP code input in cart drawer
- [ ] Calculate button triggers estimate
- [ ] Shipping estimate displayed
- [ ] Loading state while calculating
- [ ] Error handling for invalid ZIP
- [ ] Note that estimate may vary at checkout

---

### 3.3 Order Tracking Link

**Why:** Customers want to track shipments without contacting support.

**Current state:** No order tracking page. Tracking info presumably sent via email.

**Requirements:**
- Create `/track/` page
- Simple form: Order number + Email
- Display tracking info or link to carrier tracking
- If no tracking yet, show appropriate message

**Technical hints:**
- Would require storing order → tracking number mapping
- Could integrate with shipping carrier APIs (USPS, etc.)
- Simpler: just link out to carrier tracking page with number
- May need database/KV to store tracking numbers from fulfillment

**Note:** This is more complex and may require fulfillment workflow changes. Consider if worth the effort vs. just emailing tracking numbers.

**Acceptance criteria:**
- [ ] Track page at `/track/`
- [ ] Order lookup form
- [ ] Displays tracking number and carrier link
- [ ] Handles "not yet shipped" gracefully
- [ ] Handles "order not found" gracefully

---

## Priority 4: Nice-to-Have

### 4.1 Product Quick View Modal

**Why:** View product details without leaving the grid.

**Requirements:**
- Click product card opens modal with full details
- Can add to cart from modal
- Close returns to grid at same scroll position

---

### 4.2 Recently Viewed Products

**Why:** Help users find products they looked at before.

**Requirements:**
- Track viewed products in localStorage
- Show "Recently Viewed" section on homepage
- Limit to last 4-6 products

---

### 4.3 Back in Stock Notifications

**Why:** Capture interest in out-of-stock items.

**Requirements:**
- "Notify me" button on out-of-stock products
- Email input modal
- Store email + product ID
- Send email when product restocked (requires webhook integration)

---

### 4.4 Wishlist

**Why:** Let users save items for later without adding to cart.

**Requirements:**
- Heart icon on product cards
- Wishlist page showing saved items
- Persist in localStorage
- Optional: sync to account if accounts added later

---

## Technical Debt / Code Quality (Do First)

These should be addressed before adding new features to avoid compounding technical debt.

### T.1 Fix Webhook Silent Failure (Critical)

**Why:** If inventory update fails after checkout, the webhook returns 200 OK anyway. Stripe won't retry, and inventory gets out of sync.

**Current state:** `src/pages/api/webhook.ts` lines 74-76 catch errors but still return success.

**File:** `src/pages/api/webhook.ts`

**Requirements:**
- Return 500 status code when inventory update fails
- Stripe will automatically retry failed webhooks
- Log the error for debugging

**Fix:**
```typescript
// Change this:
} catch (err) {
  console.error("Error processing checkout.session.completed:", err);
}
// Returns 200 OK regardless!

// To this:
} catch (err) {
  console.error("Error processing checkout.session.completed:", err);
  return new Response(JSON.stringify({ error: "Inventory update failed" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}
```

**Acceptance criteria:**
- [ ] Webhook returns 500 on inventory update failure
- [ ] Error is logged with details
- [ ] Successful checkouts still return 200

---

### T.2 Add ESLint + Prettier

**Why:** No linting or formatting config exists. Code style is inconsistent and bugs can slip through.

**Current state:** No `.eslintrc`, no `.prettierrc`, no lint scripts.

**Requirements:**
- Add ESLint with TypeScript and React plugins
- Add Prettier for formatting
- Add npm scripts: `lint`, `lint:fix`, `format`
- Fix any existing lint errors

**Technical hints:**
```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks prettier eslint-config-prettier
```

**Acceptance criteria:**
- [ ] `npm run lint` runs without config errors
- [ ] `npm run format` formats all files
- [ ] No lint errors in existing code (or documented exceptions)
- [ ] Add to `npm run check` script

---

### T.3 Remove `as any` Type Casts

**Why:** API routes cast `locals` to `any`, defeating TypeScript's safety. Types are already defined in `env.d.ts`.

**Current state:** Three API files use `(locals as any).runtime`.

**Files to fix:**
- `src/pages/api/create-checkout.ts` line 7
- `src/pages/api/products.ts` line 7
- `src/pages/api/webhook.ts` line 18

**Fix:**
```typescript
// Change this:
const { env } = (locals as any).runtime;

// To this:
const { env } = locals.runtime;
```

The types are already defined in `src/env.d.ts` - just remove the cast.

**Acceptance criteria:**
- [ ] No `as any` casts in API routes
- [ ] TypeScript compiles without errors
- [ ] All API endpoints still function

---

### T.4 Add localStorage Validation in CartProvider

**Why:** Cart data from localStorage is parsed without validation. Corrupted data could crash the app.

**Current state:** `src/components/CartProvider.tsx` line 26 does `JSON.parse(stored)` with no schema validation.

**File:** `src/components/CartProvider.tsx`

**Requirements:**
- Validate parsed data matches expected CartItem[] shape
- Clear invalid data rather than crash
- Log warning when clearing corrupted cart

**Technical hints:**
```typescript
function isValidCartItem(item: unknown): item is CartItem {
  return (
    typeof item === "object" &&
    item !== null &&
    typeof (item as CartItem).id === "string" &&
    typeof (item as CartItem).quantity === "number"
    // ... etc
  );
}

function isValidCart(data: unknown): data is CartItem[] {
  return Array.isArray(data) && data.every(isValidCartItem);
}
```

**Acceptance criteria:**
- [ ] Invalid localStorage data doesn't crash the app
- [ ] Invalid data is cleared and cart starts empty
- [ ] Warning logged for debugging
- [ ] Valid cart data still loads correctly

---

### T.5 Dependabot Vulnerabilities

**Why:** 4 known vulnerabilities (2 high, 2 moderate) in the dependency tree.

**Current state:** `undici` vulnerability affects `wrangler` → `miniflare` → `@astrojs/cloudflare`.

**Requirements:**
- Run `npm audit` to see current state
- Update packages: `npm update` or `npm audit fix`
- Test that site still builds and deploys
- If breaking changes required, document and schedule

**Acceptance criteria:**
- [ ] `npm audit` shows 0 high/critical vulnerabilities
- [ ] Site builds successfully
- [ ] Site deploys successfully
- [ ] All features still work

---

### T.6 Extract Shared `formatPrice` Utility

**Why:** Same function duplicated in two files. DRY violation.

**Current state:**
- `src/components/ProductCard.tsx` lines 14-16
- `src/components/CartDrawer.tsx` lines 21-23

**Requirements:**
- Create `src/lib/format.ts` with shared utilities
- Export `formatPrice(cents: number): string`
- Update both components to import from shared location

**Acceptance criteria:**
- [ ] Single `formatPrice` function in `src/lib/format.ts`
- [ ] Both components import from shared location
- [ ] Prices still display correctly

---

### T.7 Custom 404 Page

**Why:** Default 404 is generic and doesn't match site branding.

**Current state:** Uses default Astro/Cloudflare 404.

**Requirements:**
- Create `src/pages/404.astro`
- Match site styling (use BaseHead, Header, Footer)
- Friendly message: "Page not found"
- Link back to store

**Acceptance criteria:**
- [ ] Custom 404 page at `/404.astro`
- [ ] Matches site styling
- [ ] Has link to homepage
- [ ] Works for invalid routes

---

### T.8 Add Basic Test Framework

**Why:** Zero test coverage. Any refactor is risky, and bugs can slip into production.

**Current state:** No test files, no test framework, no test scripts.

**Requirements:**
- Add Vitest (recommended for Astro/Vite projects)
- Add at least 1-2 smoke tests:
  - Cart add/remove logic
  - Price formatting
- Add `npm run test` script

**Technical hints:**
```bash
npm install -D vitest @testing-library/react jsdom
```

Start with pure function tests (formatPrice, cart logic) before component tests.

**Acceptance criteria:**
- [ ] `npm run test` runs successfully
- [ ] At least 2 passing tests
- [ ] Tests documented in README or this file

---

### T.9 Loading States Audit

**Why:** Some async operations may lack loading feedback, causing confusion.

**Current state:** Cart checkout has loading state, but others may not.

**Requirements:**
- Audit all async operations:
  - Product fetch on page load
  - Add to cart
  - Checkout redirect
  - Any future API calls
- Add spinner or skeleton where missing
- Disable buttons during loading to prevent double-clicks

**Acceptance criteria:**
- [ ] All async operations show loading feedback
- [ ] Buttons disabled during operations
- [ ] No "flash of empty content" on page load

---

## Notes for Implementation

### Development Workflow
```bash
npm run dev          # Start local dev server
npm run build        # Build for production
npm run check        # Type check + build + dry-run deploy
npm run deploy       # Build and deploy to Cloudflare
```

### Key Files
| File | Purpose |
|------|---------|
| `src/pages/index.astro` | Homepage / store |
| `src/components/MainPage.tsx` | Product grid, sorting |
| `src/components/ProductCard.tsx` | Individual product card |
| `src/components/CartProvider.tsx` | Cart state management |
| `src/components/CartDrawer.tsx` | Cart UI |
| `src/lib/stripeProducts.ts` | Stripe product fetching |
| `src/types.ts` | TypeScript types |
| `src/components/BaseHead.astro` | SEO meta tags |

### Testing Checklist
Before deploying any feature:
- [ ] Works on mobile viewport
- [ ] Works on desktop viewport
- [ ] No TypeScript errors (`npm run check`)
- [ ] No console errors in browser
- [ ] Cart still functions correctly
- [ ] Checkout still functions correctly
