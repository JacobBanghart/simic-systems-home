import fs from "node:fs/promises";
import process from "node:process";
import Stripe from "stripe";
import { loadLocalEnv } from "./lib/env.mjs";

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "") || "product";
}

function escapeText(value) {
  return JSON.stringify(value ?? "");
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
  const products = [];

  for await (const product of stripe.products.list({
    limit: 100,
    expand: ["data.default_price"],
  })) {
    if (!product.default_price || typeof product.default_price === "string") {
      continue;
    }

    const price = product.default_price;
    const category = product.metadata.category || "magic";
    const key = product.metadata.catalogKey || slugify(product.name);
    const sortOrder = Number.parseInt(product.metadata.sortOrder || "999", 10);
    const quantity = product.metadata.quantity;

    products.push({
      key,
      name: product.name,
      description: product.description || "",
      category,
      price: price.unit_amount || 0,
      image: product.images[0] || "",
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 999,
      active: product.active !== false,
      quantity:
        quantity !== undefined && quantity !== ""
          ? Number.parseInt(quantity, 10)
          : undefined,
    });
  }

  products.sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.name.localeCompare(right.name);
  });

  const body = [
    "/**",
    " * Repo-managed catalog for Stripe products.",
    " * Generated from current Stripe products.",
    " */",
    "",
    "export default [",
    ...products.map((product) => {
      const lines = [
        "  {",
        `    key: ${escapeText(product.key)},`,
        `    name: ${escapeText(product.name)},`,
        `    description: ${escapeText(product.description)},`,
        `    category: ${escapeText(product.category)},`,
        `    price: ${product.price},`,
        `    image: ${escapeText(product.image)},`,
        `    sortOrder: ${product.sortOrder},`,
        `    active: ${product.active},`,
      ];

      if (product.quantity !== undefined && Number.isFinite(product.quantity)) {
        lines.push(`    quantity: ${product.quantity},`);
      }

      lines.push("  },");
      return lines.join("\n");
    }),
    "];",
    "",
  ].join("\n");

  const outputPath = new URL("../catalog/products.mjs", import.meta.url);
  await fs.writeFile(outputPath, body, "utf8");
  console.log(`Wrote ${products.length} products to catalog/products.mjs`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});