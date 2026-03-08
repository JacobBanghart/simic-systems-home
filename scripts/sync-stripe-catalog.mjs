import process from "node:process";
import Stripe from "stripe";
import catalogProducts from "../catalog/products.mjs";
import { loadLocalEnv } from "./lib/env.mjs";

const dryRun = process.argv.includes("--dry-run");
const allowEmpty = process.argv.includes("--allow-empty");
const allowedCategories = new Set(["magic", "onepiece", "unionarena"]);

function normalizeCatalogProduct(product, index) {
  if (!product || typeof product !== "object") {
    throw new Error(`Catalog entry at index ${index} must be an object.`);
  }

  const key = typeof product.key === "string" ? product.key.trim() : "";
  const name = typeof product.name === "string" ? product.name.trim() : "";
  const description =
    typeof product.description === "string" ? product.description.trim() : "";
  const category =
    typeof product.category === "string" ? product.category.trim() : "";
  const image = typeof product.image === "string" ? product.image.trim() : "";
  const sortOrder = Number.isInteger(product.sortOrder) ? product.sortOrder : index + 1;
  const price = Number.isInteger(product.price) ? product.price : Number.NaN;
  const active = product.active !== false;
  const quantity =
    product.quantity === undefined
      ? undefined
      : Number.isInteger(product.quantity)
        ? product.quantity
        : Number.NaN;

  if (!key) {
    throw new Error(`Catalog entry at index ${index} is missing a valid key.`);
  }

  if (!name) {
    throw new Error(`Catalog entry "${key}" is missing a valid name.`);
  }

  if (!allowedCategories.has(category)) {
    throw new Error(
      `Catalog entry "${key}" has invalid category "${category}".`
    );
  }

  if (!Number.isInteger(price) || price < 0) {
    throw new Error(`Catalog entry "${key}" must use an integer cent price.`);
  }

  if (!Number.isInteger(sortOrder)) {
    throw new Error(`Catalog entry "${key}" must use an integer sortOrder.`);
  }

  if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 0)) {
    throw new Error(`Catalog entry "${key}" has an invalid quantity.`);
  }

  return {
    key,
    name,
    description,
    category,
    image,
    price,
    sortOrder,
    active,
    quantity,
  };
}

function createMetadata(product, existingProduct) {
  const metadata = {
    ...(existingProduct?.metadata ?? {}),
    catalogManaged: "true",
    catalogKey: product.key,
    category: product.category,
    sortOrder: String(product.sortOrder),
  };

  if (product.quantity !== undefined) {
    metadata.quantity = String(product.quantity);
  } else if (!metadata.quantity) {
    metadata.quantity = "0";
  }

  return metadata;
}

function logAction(message) {
  console.log(dryRun ? `[dry-run] ${message}` : message);
}

async function maybeRun(action, callback) {
  logAction(action);
  if (!dryRun) {
    return callback();
  }

  return undefined;
}

async function listAllProducts(stripe) {
  const products = [];
  for await (const product of stripe.products.list({
    limit: 100,
    expand: ["data.default_price"],
  })) {
    products.push(product);
  }
  return products;
}

async function main() {
  const localEnv = await loadLocalEnv(new URL("../", import.meta.url));
  const stripeKey = process.env.STRIPE_SECRET_KEY || localEnv.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY. Set it in the shell or in .dev.vars."
    );
  }

  const normalizedCatalog = catalogProducts.map(normalizeCatalogProduct);
  const uniqueKeys = new Set();
  for (const product of normalizedCatalog) {
    if (uniqueKeys.has(product.key)) {
      throw new Error(`Duplicate catalog key "${product.key}".`);
    }
    uniqueKeys.add(product.key);
  }

  if (normalizedCatalog.length === 0 && !allowEmpty) {
    throw new Error(
      "Catalog is empty. Refusing to continue without --allow-empty."
    );
  }

  const stripe = new Stripe(stripeKey);
  const existingProducts = await listAllProducts(stripe);
  const managedProducts = existingProducts.filter(
    (product) => product.metadata.catalogManaged === "true"
  );

  const managedByKey = new Map(
    managedProducts
      .filter((product) => product.metadata.catalogKey)
      .map((product) => [product.metadata.catalogKey, product])
  );

  const adoptableByName = new Map();
  for (const product of existingProducts) {
    const normalizedName = product.name.trim().toLowerCase();
    if (!normalizedName) {
      continue;
    }

    const current = adoptableByName.get(normalizedName);
    if (!current) {
      adoptableByName.set(normalizedName, product);
    } else {
      adoptableByName.set(normalizedName, null);
    }
  }

  const seenManagedKeys = new Set();

  for (const product of normalizedCatalog) {
    let existingProduct = managedByKey.get(product.key);

    if (!existingProduct) {
      const byName = adoptableByName.get(product.name.trim().toLowerCase());
      if (byName && byName.metadata.catalogManaged !== "true") {
        existingProduct = byName;
      }
    }

    const metadata = createMetadata(product, existingProduct);

    if (!existingProduct) {
      const createdProduct = await maybeRun(
        `Create product ${product.name}`,
        () =>
          stripe.products.create({
            name: product.name,
            description: product.description,
            images: product.image ? [product.image] : [],
            active: product.active,
            metadata,
          })
      );

      const targetProductId = createdProduct?.id;
      if (targetProductId) {
        const createdPrice = await maybeRun(
          `Create price for ${product.name} at $${(product.price / 100).toFixed(2)}`,
          () =>
            stripe.prices.create({
              product: targetProductId,
              unit_amount: product.price,
              currency: "usd",
            })
        );

        if (createdPrice) {
          await maybeRun(`Set default price for ${product.name}`, () =>
            stripe.products.update(targetProductId, {
              default_price: createdPrice.id,
            })
          );
        }
      }

      continue;
    }

    seenManagedKeys.add(product.key);

    await maybeRun(`Update product ${product.name}`, () =>
      stripe.products.update(existingProduct.id, {
        name: product.name,
        description: product.description,
        images: product.image ? [product.image] : [],
        active: product.active,
        metadata,
      })
    );

    const currentDefaultPrice =
      existingProduct.default_price && typeof existingProduct.default_price !== "string"
        ? existingProduct.default_price
        : null;

    const needsPriceUpdate =
      !currentDefaultPrice ||
      currentDefaultPrice.unit_amount !== product.price ||
      currentDefaultPrice.currency !== "usd" ||
      currentDefaultPrice.active === false;

    if (needsPriceUpdate) {
      const newPrice = await maybeRun(
        `Create replacement price for ${product.name} at $${(product.price / 100).toFixed(2)}`,
        () =>
          stripe.prices.create({
            product: existingProduct.id,
            unit_amount: product.price,
            currency: "usd",
          })
      );

      if (newPrice) {
        await maybeRun(`Swap default price for ${product.name}`, () =>
          stripe.products.update(existingProduct.id, {
            default_price: newPrice.id,
          })
        );
      }

      if (currentDefaultPrice?.active) {
        await maybeRun(`Deactivate old price for ${product.name}`, () =>
          stripe.prices.update(currentDefaultPrice.id, {
            active: false,
          })
        );
      }
    }
  }

  for (const product of managedProducts) {
    const managedKey = product.metadata.catalogKey;
    if (!managedKey || uniqueKeys.has(managedKey)) {
      continue;
    }

    if (seenManagedKeys.has(managedKey)) {
      continue;
    }

    await maybeRun(`Archive removed product ${product.name}`, () =>
      stripe.products.update(product.id, { active: false })
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});