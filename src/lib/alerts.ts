import { ORDER_EMAIL_FROM } from "./email/send";

// Plain-text heads-up emails to the shop owner, for things that otherwise only
// reach the Worker logs: new orders, disputes, refunds that need a manual stock
// decision, and failures in the order/shipped email pipeline. Sent through the
// same Email Service binding as customer mail; in test mode (sk_test_ key) they
// go to ORDER_EMAIL_DEV_TO instead, or nowhere.
export const OWNER_ALERT_TO = "contact@simic.systems";

interface AlertEnv {
  ORDER_EMAIL: SendEmail;
  STRIPE_SECRET_KEY: string;
  ORDER_EMAIL_DEV_TO?: string;
}

export function alertRecipient(env: Pick<AlertEnv, "STRIPE_SECRET_KEY" | "ORDER_EMAIL_DEV_TO">): string | null {
  if (env.STRIPE_SECRET_KEY.startsWith("sk_test_")) return env.ORDER_EMAIL_DEV_TO || null;
  return OWNER_ALERT_TO;
}

// Never throws: an alert is a side channel, and failing to send one must not
// fail (and so retry) the webhook or cron run that raised it.
export async function alertOwner(env: AlertEnv, subject: string, lines: string[]): Promise<void> {
  const to = alertRecipient(env);
  if (!to) {
    console.log(`Owner alert skipped (test mode without ORDER_EMAIL_DEV_TO): ${subject}`);
    return;
  }
  const mode = env.STRIPE_SECRET_KEY.startsWith("sk_test_") ? "[TEST] " : "";
  try {
    await env.ORDER_EMAIL.send({
      from: ORDER_EMAIL_FROM,
      to,
      subject: `${mode}[Simic] ${subject}`,
      text: lines.join("\n"),
    });
  } catch (err) {
    console.error(`Owner alert failed to send (${subject}):`, err);
  }
}

export function dashboardUrl(env: Pick<AlertEnv, "STRIPE_SECRET_KEY">, path: string): string {
  const test = env.STRIPE_SECRET_KEY.startsWith("sk_test_") ? "/test" : "";
  return `https://dashboard.stripe.com${test}/${path.replace(/^\//, "")}`;
}
