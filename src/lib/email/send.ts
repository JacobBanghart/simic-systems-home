import { renderOrderConfirmation, type OrderEmailData } from "./orderConfirmation";

export const ORDER_EMAIL_FROM = { email: "orders@simic.systems", name: "Simic Systems" };
export const ORDER_EMAIL_REPLY_TO = "contact@simic.systems";

interface OrderEmailEnv {
  ORDER_EMAIL: SendEmail;
  STRIPE_SECRET_KEY: string;
  ORDER_EMAIL_DEV_TO?: string;
}

// Where a confirmation actually goes. Test-mode orders (sk_test_ key: local
// dev) never reach the customer address: they're redirected to
// ORDER_EMAIL_DEV_TO, or not sent at all if that isn't set.
export function resolveRecipient(env: Pick<OrderEmailEnv, "STRIPE_SECRET_KEY" | "ORDER_EMAIL_DEV_TO">, customerEmail: string): string | null {
  if (env.STRIPE_SECRET_KEY.startsWith("sk_test_")) return env.ORDER_EMAIL_DEV_TO || null;
  return customerEmail;
}

export async function sendOrderConfirmation(env: OrderEmailEnv, data: OrderEmailData): Promise<string | null> {
  const to = resolveRecipient(env, data.customerEmail);
  if (!to) {
    console.log(`Order email for ${data.orderNumber} skipped: test mode without ORDER_EMAIL_DEV_TO`);
    return null;
  }
  const { subject, html, text } = renderOrderConfirmation(data);
  const result = await env.ORDER_EMAIL.send({
    from: ORDER_EMAIL_FROM,
    to,
    replyTo: ORDER_EMAIL_REPLY_TO,
    subject: to === data.customerEmail ? subject : `[TEST → ${data.customerEmail}] ${subject}`,
    html,
    text,
  });
  return result.messageId;
}
