/**
 * resend-failed-webhooks.mjs
 *
 * Fetches all failed webhook delivery attempts for a given event type
 * within a date range and resends them via the Stripe API.
 *
 * Usage (runs against LIVE Stripe; the key comes from Vault):
 *   mise run stripe:resend-webhooks
 *   mise run stripe:resend-webhooks -- --type product.updated
 *   mise run stripe:resend-webhooks -- --since 2026-04-06 --until 2026-04-09
 *   mise run stripe:resend-webhooks -- --dry-run
 */

import process from "node:process";
import Stripe from "stripe";

const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const DRY_RUN = hasFlag("--dry-run");
const EVENT_TYPE = getArg("--type") ?? "product.updated";
const SINCE = getArg("--since") ? Math.floor(new Date(getArg("--since")).getTime() / 1000) : null;
const UNTIL = getArg("--until") ? Math.floor(new Date(getArg("--until")).getTime() / 1000) : null;

async function main() {
  // Only the explicitly-named live key: STRIPE_SECRET_KEY in this repo's
  // environment is the sandbox key (mise [env]), and silently resending
  // sandbox events instead of live ones would look like "nothing failed".
  const stripeKey = process.env.STRIPE_LIVE_SECRET_KEY;
  if (!stripeKey) {
    throw new Error("Missing STRIPE_LIVE_SECRET_KEY. Run via `mise run stripe:resend-webhooks`.");
  }
  console.log(`Stripe mode: ${stripeKey.includes("_live_") ? "LIVE" : "TEST"}`);

  const stripe = new Stripe(stripeKey);

  console.log(`Fetching failed events: type=${EVENT_TYPE}${DRY_RUN ? " [DRY RUN]" : ""}`);

  const listParams = {
    type: EVENT_TYPE,
    delivery_success: false,
  };
  if (SINCE) listParams.created = { ...listParams.created, gte: SINCE };
  if (UNTIL) listParams.created = { ...listParams.created, lte: UNTIL };

  const failed = [];
  for await (const event of stripe.events.list(listParams)) {
    failed.push(event);
  }

  if (failed.length === 0) {
    console.log("No failed events found.");
    return;
  }

  console.log(`Found ${failed.length} failed event(s).`);

  let resent = 0;
  let errored = 0;

  for (const event of failed) {
    const date = new Date(event.created * 1000).toISOString();
    if (DRY_RUN) {
      console.log(`  [dry-run] would resend ${event.id} (${date})`);
      continue;
    }

    try {
      await stripe.rawRequest("POST", `/v1/events/${event.id}/retry`);
      console.log(`  resent ${event.id} (${date})`);
      resent++;
    } catch (err) {
      console.error(`  failed to resend ${event.id}: ${err.message}`);
      errored++;
    }
  }

  if (!DRY_RUN) {
    console.log(`\nDone. Resent: ${resent}, Errors: ${errored}`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
