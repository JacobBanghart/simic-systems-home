/**
 * Post-build: clean dist/server/wrangler.json before wrangler deploy.
 *
 * @astrojs/cloudflare v14 generates a wrangler.json in dist/server/ that
 * includes a SESSION KV namespace binding with no id. wrangler deploy
 * requires KV bindings to have an id. This app does not use Astro sessions,
 * so we strip any KV namespace entries that are missing an id.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../../");
const CONFIG = path.join(ROOT, "dist", "server", "wrangler.json");

async function main() {
  let raw;
  try {
    raw = await fs.readFile(CONFIG, "utf8");
  } catch {
    console.error(`patch-wrangler-deploy: ${CONFIG} not found — skipping.`);
    process.exitCode = 1;
    return;
  }

  const config = JSON.parse(raw);

  const before = (config.kv_namespaces ?? []).length;
  config.kv_namespaces = (config.kv_namespaces ?? []).filter((kv) => kv.id);
  const after = config.kv_namespaces.length;

  if (before === after) {
    console.log("patch-wrangler-deploy: no id-less KV bindings found — nothing to do.");
    return;
  }

  await fs.writeFile(CONFIG, JSON.stringify(config), "utf8");
  console.log(
    `patch-wrangler-deploy: removed ${before - after} KV binding(s) without id from dist/server/wrangler.json`
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
