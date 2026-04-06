/**
 * Set URL slug metadata on Stripe products.
 *
 * Usage — list current products and their slugs:
 *   node scripts/set-slugs.mjs
 *
 * Usage — apply slugs from a JSON file:
 *   node scripts/set-slugs.mjs slugs.json
 *
 * The JSON file must be an object mapping Stripe product ID to slug string:
 *   {
 *     "prod_abc123": "tarkir-dragonstorm-play-booster-display",
 *     "prod_xyz789": "wilds-of-eldraine-collector-booster-display"
 *   }
 *
 * Slugs must be:
 *   - lowercase letters, numbers, and hyphens only
 *   - unique across all products (two products cannot share a slug)
 *   - stable — changing a slug after indexing requires a redirect
 *
 * Once set, slugs are used as the URL path: /product/<slug>/
 */

import fs from "node:fs/promises";
import process from "node:process";
import Stripe from "stripe";
import { loadLocalEnv } from "./lib/env.mjs";

function suggestSlug(name) {
  const parts = name.split(" - ");
  const last = parts[parts.length - 1];
  const cleaned = /\([A-Z0-9]{2,5}\)\s*$/.test(last)
    ? parts.slice(0, -1).join(" - ")
    : name;
  return cleaned
    .replace(/'/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidSlug(slug) {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug);
}

async function main() {
  const localEnv = await loadLocalEnv(new URL("../", import.meta.url));
  const stripeKey = process.env.STRIPE_SECRET_KEY || localEnv.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY. Set it in the shell or in .dev.vars."
    );
  }

  const stripe = new Stripe(stripeKey);

  // Fetch all active products
  const products = [];
  for await (const product of stripe.products.list({ limit: 100 })) {
    products.push(product);
  }

  products.sort((a, b) => a.name.localeCompare(b.name));

  // No file argument — print current state and suggested slugs
  const slugFile = process.argv[2];
  if (!slugFile) {
    console.log("\nCurrent products, slugs, and suggestions:\n");
    const col1 = Math.max(...products.map((p) => p.id.length), 10);
    const col2 = Math.max(...products.map((p) => (p.metadata.slug ?? suggestSlug(p.name)).length), 4);
    const header =
      "ID".padEnd(col1) + "  " + "Slug (current/suggested)".padEnd(col2);
    console.log(header);
    console.log("-".repeat(header.length));
    for (const p of products) {
      const slug = p.metadata.slug ?? `(suggested) ${suggestSlug(p.name)}`;
      console.log(p.id.padEnd(col1) + "  " + slug);
    }
    console.log(
      `\nTo set slugs, create a JSON file and run:\n  node scripts/set-slugs.mjs slugs.json\n`
    );
    return;
  }

  // Load the slug map from file
  const raw = await fs.readFile(slugFile, "utf8");
  const slugMap = JSON.parse(raw);

  if (typeof slugMap !== "object" || Array.isArray(slugMap)) {
    throw new Error('slugs.json must be a plain object: { "prod_...": "slug", ... }');
  }

  const entries = Object.entries(slugMap);
  if (entries.length === 0) {
    console.log("No entries in file — nothing to do.");
    return;
  }

  // Validate slugs
  const invalidSlugs = entries.filter(([, slug]) => !isValidSlug(String(slug)));
  if (invalidSlugs.length > 0) {
    throw new Error(
      `Invalid slugs (lowercase letters, numbers, hyphens only):\n  ${invalidSlugs.map(([id, s]) => `${id}: "${s}"`).join("\n  ")}`
    );
  }

  // Check for duplicates within the file
  const slugValues = entries.map(([, slug]) => String(slug));
  const duplicates = slugValues.filter((s, i) => slugValues.indexOf(s) !== i);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate slugs in file: ${[...new Set(duplicates)].join(", ")}`);
  }

  // Validate that all IDs exist
  const knownIds = new Set(products.map((p) => p.id));
  const unknown = entries.filter(([id]) => !knownIds.has(id));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown product IDs:\n  ${unknown.map(([id]) => id).join("\n  ")}`
    );
  }

  // Check for slug conflicts with products NOT in this file
  const existingSlugs = new Map(
    products
      .filter((p) => p.metadata.slug && !slugMap[p.id])
      .map((p) => [p.metadata.slug, p.id])
  );
  const conflicts = entries.filter(([, slug]) => existingSlugs.has(String(slug)));
  if (conflicts.length > 0) {
    throw new Error(
      `Slug conflicts with existing products:\n  ${conflicts.map(([id, slug]) => `${id}: "${slug}" already used by ${existingSlugs.get(String(slug))}`).join("\n  ")}`
    );
  }

  // Apply updates
  let updated = 0;
  let skipped = 0;
  for (const [productId, slug] of entries) {
    const existing = products.find((p) => p.id === productId);
    if (existing?.metadata.slug === String(slug)) {
      console.log(`  skip  ${productId}  (slug already set to "${slug}")`);
      skipped++;
      continue;
    }
    await stripe.products.update(productId, {
      metadata: { slug: String(slug) },
    });
    const name = existing?.name ?? productId;
    console.log(`  set   ${productId}  ${slug}  (${name})`);
    updated++;
  }

  console.log(`\nDone. ${updated} updated, ${skipped} skipped.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
