/**
 * Post-build: rewrite dist/sitemap-index.xml to include sitemap-products.xml.
 *
 * @astrojs/sitemap only generates sitemap-0.xml (static pages) and writes its
 * own sitemap-index.xml at build time.  sitemap-products.xml is a live SSR
 * endpoint that is NOT included by the integration.  This script appends the
 * missing entry so both sitemaps are discoverable from the index.
 *
 * Run automatically as part of the build:
 *   "build": "astro build && node scripts/patch-sitemap-index.mjs"
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../../");
const SITEMAP_INDEX = path.join(ROOT, "dist", "sitemap-index.xml");
const SITE = "https://simic.systems";

async function main() {
  let xml;
  try {
    xml = await fs.readFile(SITEMAP_INDEX, "utf8");
  } catch {
    console.error(`patch-sitemap-index: ${SITEMAP_INDEX} not found — skipping.`);
    process.exitCode = 1;
    return;
  }

  const entry = `\t<sitemap>\n\t\t<loc>${SITE}/sitemap-products.xml</loc>\n\t</sitemap>`;

  if (xml.includes("/sitemap-products.xml")) {
    console.log("patch-sitemap-index: sitemap-products.xml already present — nothing to do.");
    return;
  }

  // Insert the new entry before the closing </sitemapindex> tag.
  const patched = xml.replace("</sitemapindex>", `${entry}\n</sitemapindex>`);

  if (patched === xml) {
    console.error("patch-sitemap-index: could not find </sitemapindex> tag — skipping.");
    process.exitCode = 1;
    return;
  }

  await fs.writeFile(SITEMAP_INDEX, patched, "utf8");
  console.log("patch-sitemap-index: added sitemap-products.xml to sitemap-index.xml");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
