import type Stripe from "stripe";
import type { OrderEmailAddress, OrderEmailData } from "./orderConfirmation";

// Short, human-friendly order number derived from the PaymentIntent (what the
// Stripe dashboard shows), falling back to the session id: "SIM-2APSCN3W".
export function orderNumberFor(session: Pick<Stripe.Checkout.Session, "id" | "payment_intent">): string {
  const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  return `SIM-${(pi ?? session.id).slice(-8).toUpperCase()}`;
}

function toAddress(details?: { name?: string | null; address?: Stripe.Address | null } | null): OrderEmailAddress | undefined {
  if (!details?.address) return undefined;
  const a = details.address;
  return {
    name: details.name ?? undefined,
    line1: a.line1 ?? undefined,
    line2: a.line2 ?? undefined,
    city: a.city ?? undefined,
    state: a.state ?? undefined,
    postalCode: a.postal_code ?? undefined,
    country: a.country ?? undefined,
  };
}

// Expects the session retrieved with
// expand: ["line_items.data.price.product", "shipping_cost.shipping_rate"].
export function orderEmailFromSession(
  session: Stripe.Checkout.Session,
  lineItems: Stripe.LineItem[],
  siteUrl: string
): OrderEmailData | null {
  const email = session.customer_details?.email ?? session.customer_email;
  if (!email) return null;

  // Newer API versions moved shipping details under collected_information.
  const shipping =
    (session as unknown as { collected_information?: { shipping_details?: { name?: string; address?: Stripe.Address } } })
      .collected_information?.shipping_details ??
    (session as unknown as { shipping_details?: { name?: string; address?: Stripe.Address } }).shipping_details;

  const rate = session.shipping_cost?.shipping_rate;
  const shippingLabel = rate && typeof rate !== "string" ? rate.display_name ?? "Shipping" : "Shipping";

  return {
    orderNumber: orderNumberFor(session),
    orderDate: new Date(session.created * 1000),
    customerName: session.customer_details?.name ?? shipping?.name ?? undefined,
    customerEmail: email,
    items: lineItems.map((li) => {
      const product = li.price?.product;
      const expanded = product && typeof product !== "string" && !("deleted" in product && product.deleted) ? (product as Stripe.Product) : undefined;
      return {
        name: expanded?.name ?? li.description ?? "Item",
        quantity: li.quantity ?? 1,
        amountCents: li.amount_total ?? 0,
        imageUrl: expanded?.images?.[0],
      };
    }),
    subtotalCents: session.amount_subtotal ?? 0,
    shippingCents: session.shipping_cost?.amount_total ?? 0,
    shippingLabel,
    taxCents: session.total_details?.amount_tax ?? 0,
    totalCents: session.amount_total ?? 0,
    shippingAddress: toAddress(shipping),
    siteUrl,
  };
}
