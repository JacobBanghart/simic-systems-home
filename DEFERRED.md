# Deferred Ideas

Features considered but intentionally not pursued. Documented here so the reasoning isn't lost.

---

## Newsletter Signup

**Idea:** Email capture form in footer — "Get notified about restocks and new releases." Store emails in KV or send to Mailchimp/Buttondown.

**Why not now:** No email sending infrastructure set up beyond the contact form. Would need a newsletter service (Buttondown, Loops, ConvertKit, etc.) to actually send campaigns. Collecting emails without a plan to use them creates GDPR/CAN-SPAM liability. Revisit when there's enough traffic to justify a newsletter.

---

## Shipping Calculator

**Idea:** ZIP code input in the cart drawer that estimates shipping cost before checkout.

**Why not now:** Would require either hardcoded USPS rate tables (inaccurate, need constant updating) or a Stripe Shipping Rate API call (adds complexity). Shipping cost is already shown at Stripe checkout, which is one click away. The friction here is minimal for a small catalog.

---

## Order Tracking Page

**Idea:** `/track/` page where customers enter order number + email to see shipment status.

**Why not now:** No user accounts on the site — customers have no login to associate orders with. Would require a manual step after every shipment to store tracking numbers in KV keyed by email. At current order volume, the shipping confirmation email with USPS tracking number is sufficient. This is a workflow problem, not a code problem.

---

## Product Quick View Modal

**Idea:** Click a product card to open a modal with full details + add-to-cart, without leaving the grid.

**Why not now:** Product detail pages (`/product/[id]/`) already exist and are better for SEO (indexable URLs, schema.org, OG tags). A modal adds JS complexity and doesn't help search engines. The card-to-detail-page flow is standard e-commerce UX.

---

## Recently Viewed Products

**Idea:** Track viewed products in localStorage, show "Recently Viewed" section on homepage.

**Why not now:** With ~10 products in the catalog, the entire store fits on one screen. Recently viewed only adds value when users can't easily scan the full inventory. Revisit if catalog grows to 50+ products.

---

## Back in Stock Notifications

**Idea:** "Notify me" button on out-of-stock products. Collect email + product ID, send email when restocked.

**Why not now:** Requires email sending infrastructure (not just forwarding), a webhook to detect restock events, and a queue to send notifications. Significant complexity for a feature that only matters when products are frequently out of stock. If stock issues become common, consider a simple "email us for restock info" link instead.

---

## Wishlist

**Idea:** Heart icon on cards, wishlist page, persist in localStorage.

**Why not now:** No user accounts means wishlists are device-local and can't be shared or synced. With a small catalog, the cart already serves as a "save for later" — users can add items and remove them before checkout. Wishlists matter more for large catalogs with browsing sessions.
