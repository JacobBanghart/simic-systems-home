/**
 * Set GTIN metadata on Stripe products.
 *
 * Usage — list current products and their GTINs:
 *   node scripts/set-gtins.mjs
 *
 * Usage — apply GTINs from a JSON file:
 *   node scripts/set-gtins.mjs gtins.json
 *
 * The JSON file must be an object mapping Stripe product ID to GTIN string:
 *   {
 *     "prod_abc123": "0123456789012",
 *     "prod_xyz789": "9876543210987"
 *   }
 *
 * GTINs are the 12-14 digit barcodes printed on the product box (UPC/EAN).
 * You can look them up at https://www.barcodelookup.com or scan the box.
 */

import fs from "node:fs/promises";
import process from "node:process";
import Stripe from "stripe";
import { loadLocalEnv } from "./lib/env.mjs";

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

  // No file argument — print current state as a table
  const gtinFile = process.argv[2];
  if (!gtinFile) {
    console.log("\nCurrent products and GTINs:\n");
    const col1 = Math.max(...products.map((p) => p.id.length), 10);
    const col2 = Math.max(...products.map((p) => (p.metadata.gtin ?? "").length), 4);
    const col3 = 50;
    const header =
      "ID".padEnd(col1) + "  " + "GTIN".padEnd(col2) + "  " + "Name";
    console.log(header);
    console.log("-".repeat(header.length));
    for (const p of products) {
      const gtin = p.metadata.gtin ?? "(none)";
      const name = p.name.length > col3 ? p.name.slice(0, col3 - 1) + "…" : p.name;
      console.log(p.id.padEnd(col1) + "  " + gtin.padEnd(col2) + "  " + name);
    }
    console.log(
      `\nTo set GTINs, create a JSON file and run:\n  node scripts/set-gtins.mjs gtins.json\n`
    );
    return;
  }

  // Load the GTIN map from file
  const raw = await fs.readFile(gtinFile, "utf8");
  const gtinMap = JSON.parse(raw);

  if (typeof gtinMap !== "object" || Array.isArray(gtinMap)) {
    throw new Error("gtins.json must be a plain object: { \"prod_...\": \"gtin\", ... }");
  }

  const entries = Object.entries(gtinMap);
  if (entries.length === 0) {
    console.log("No entries in file — nothing to do.");
    return;
  }

  // Validate that all IDs exist
  const knownIds = new Set(products.map((p) => p.id));
  const unknown = entries.filter(([id]) => !knownIds.has(id));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown product IDs:\n  ${unknown.map(([id]) => id).join("\n  ")}`
    );
  }

  // Apply updates
  let updated = 0;
  let skipped = 0;
  for (const [productId, gtin] of entries) {
    const existing = products.find((p) => p.id === productId);
    if (existing?.metadata.gtin === String(gtin)) {
      console.log(`  skip  ${productId}  (GTIN already set)`);
      skipped++;
      continue;
    }
    await stripe.products.update(productId, {
      metadata: { gtin: String(gtin) },
    });
    const name = existing?.name ?? productId;
    console.log(`  set   ${productId}  ${gtin}  (${name})`);
    updated++;
  }

  console.log(`\nDone. ${updated} updated, ${skipped} skipped.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
