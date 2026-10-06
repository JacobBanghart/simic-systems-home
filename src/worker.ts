// Worker entry: the Astro site (fetch) plus a cron (scheduled) for shipped
// emails. Referenced as "main" in wrangler.json; without it the adapter uses
// @astrojs/cloudflare/entrypoints/server, which only exports fetch.
import { handle } from "@astrojs/cloudflare/handler";
import { sendPendingShipmentEmails } from "./lib/email/shipments";

export default {
  fetch: handle,
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(sendPendingShipmentEmails(env));
  },
} satisfies ExportedHandler<Env>;
