// Order confirmation email: pure data -> { subject, html, text }.
//
// Email HTML is its own dialect: table layout, inline styles, no external CSS,
// and clients that strip <style> (Gmail keeps it; Outlook desktop mangles it).
// Everything that matters is inline; the <style> block only adds progressive
// niceties (web fonts, mobile padding). The design is dark-only on purpose
// (color-scheme: dark) to match the storefront's bioluminescent palette.

export interface OrderEmailItem {
  name: string;
  quantity: number;
  amountCents: number; // line total
  imageUrl?: string;
}

export interface OrderEmailAddress {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface OrderShipment {
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
}

export interface OrderEmailData {
  orderNumber: string;
  orderDate: Date;
  customerName?: string;
  customerEmail: string;
  items: OrderEmailItem[];
  subtotalCents: number;
  shippingCents: number;
  shippingLabel: string;
  taxCents: number;
  totalCents: number;
  shippingAddress?: OrderEmailAddress;
  siteUrl: string;
  // Present => the "shipped" variant: tracking CTA, tracker at Shipped, no totals.
  shipment?: OrderShipment;
}

const C = {
  bg: "#050b0a",
  card: "#0b1513",
  cardRaised: "#101d1a",
  line: "#1c2e2a",
  text: "#dbe5e0",
  muted: "#8aa39b",
  accent: "#00dfc1",
  bio: "#9dff00",
  teal: "#0a9396",
};

const FONT_BODY = "'Hanken Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const FONT_HEAD = "'Libre Caslon Text', Georgia, 'Times New Roman', serif";
const FONT_MONO = "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, monospace";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function money(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function firstName(name?: string): string | undefined {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : undefined;
}

// Stripe product names repeat the set: "Lorwyn Eclipsed - Collector Booster
// Display - Lorwyn Eclipsed (ECL)". Split into a title and a quieter subtitle.
export function splitProductName(name: string): { title: string; subtitle?: string } {
  const parts = name.split(" - ").map((p) => p.trim());
  if (parts.length >= 2) {
    return { title: `${parts[0]} ${parts[1]}`.replace(/\s+/g, " "), subtitle: parts[2] };
  }
  return { title: name };
}

function addressLines(a?: OrderEmailAddress): string[] {
  if (!a) return [];
  const cityLine = [a.city, [a.state, a.postalCode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [a.name, a.line1, a.line2, cityLine].filter((l): l is string => Boolean(l && l.trim()));
}

function itemRow(item: OrderEmailItem): string {
  const { title, subtitle } = splitProductName(item.name);
  const thumb = item.imageUrl
    ? `<img src="${escapeHtml(item.imageUrl)}" width="72" height="72" alt="" style="display:block;width:72px;height:72px;border-radius:10px;object-fit:cover;background:${C.cardRaised};border:1px solid ${C.line};">`
    : `<div style="width:72px;height:72px;border-radius:10px;background:${C.cardRaised};border:1px solid ${C.line};"></div>`;
  return `
<tr>
  <td style="padding:14px 0;border-bottom:1px solid ${C.line};" width="88" valign="top">${thumb}</td>
  <td style="padding:14px 12px 14px 0;border-bottom:1px solid ${C.line};" valign="top">
    <div style="font-family:${FONT_BODY};font-size:15px;line-height:21px;color:${C.text};font-weight:600;">${escapeHtml(title)}</div>
    ${subtitle ? `<div style="font-family:${FONT_BODY};font-size:13px;line-height:19px;color:${C.muted};">${escapeHtml(subtitle)}</div>` : ""}
    <div style="font-family:${FONT_MONO};font-size:12px;line-height:18px;color:${C.accent};padding-top:6px;letter-spacing:0.5px;">QTY ${item.quantity}</div>
  </td>
  <td style="padding:14px 0;border-bottom:1px solid ${C.line};font-family:${FONT_MONO};font-size:15px;line-height:21px;color:${C.text};white-space:nowrap;" valign="top" align="right">${money(item.amountCents)}</td>
</tr>`;
}

function totalRow(label: string, value: string, opts: { strong?: boolean } = {}): string {
  const size = opts.strong ? 18 : 14;
  const color = opts.strong ? C.text : C.muted;
  return `
<tr>
  <td style="padding:${opts.strong ? "14px 0 0" : "4px 0"};font-family:${FONT_BODY};font-size:${size}px;line-height:24px;color:${color};${opts.strong ? "font-weight:700;" : ""}">${escapeHtml(label)}</td>
  <td style="padding:${opts.strong ? "14px 0 0" : "4px 0"};font-family:${FONT_MONO};font-size:${size}px;line-height:24px;color:${opts.strong ? C.bio : C.text};${opts.strong ? "font-weight:700;" : ""}" align="right">${value}</td>
</tr>`;
}

// Four-stage tracker; stages up to and including `stage` are lit.
function tracker(stage: number, note: string): string {
  const steps = ["Confirmed", "Packed", "Shipped", "Delivered"];
  const cells = steps
    .map((label, i) => {
      const lit = i <= stage;
      const dot = lit
        ? `<div style="width:14px;height:14px;border-radius:7px;background:${C.bio};margin:0 auto;box-shadow:0 0 12px ${C.bio};"></div>`
        : `<div style="width:12px;height:12px;border-radius:7px;border:1px solid ${C.muted};margin:0 auto;"></div>`;
      return `<td width="25%" align="center" valign="top" style="padding:0 2px;">
        ${dot}
        <div style="font-family:${FONT_MONO};font-size:10px;line-height:14px;letter-spacing:1px;text-transform:uppercase;color:${lit ? C.bio : C.muted};padding-top:8px;">${label}</div>
      </td>`;
    })
    .join("");
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.cardRaised};border:1px solid ${C.line};border-radius:12px;">
  <tr><td style="padding:18px 12px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>
  </td></tr>
  <tr><td style="padding:10px 20px 18px;font-family:${FONT_BODY};font-size:13px;line-height:20px;color:${C.muted};" align="center">
    ${note}
  </td></tr>
</table>`;
}

function trackButton(s: OrderShipment): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
  <td style="border-radius:999px;background:${C.bio};background-image:linear-gradient(90deg, ${C.accent}, ${C.bio});" bgcolor="${C.bio}">
    <a href="${escapeHtml(s.trackingUrl)}" style="display:inline-block;padding:14px 28px;font-family:${FONT_MONO};font-size:13px;font-weight:700;letter-spacing:2px;color:#03140f;text-decoration:none;">TRACK&nbsp;PACKAGE&nbsp;&rarr;</a>
  </td>
</tr></table>
<div style="padding-top:12px;font-family:${FONT_MONO};font-size:12px;line-height:18px;color:${C.muted};">${escapeHtml(s.carrier)}&nbsp;&middot;&nbsp;<span style="color:${C.text};">${escapeHtml(s.trackingNumber)}</span></div>`;
}

export function renderOrderConfirmation(data: OrderEmailData): { subject: string; html: string; text: string } {
  const greetingName = firstName(data.customerName);
  const itemCount = data.items.reduce((n, i) => n + i.quantity, 0);
  const ship = data.shipment;
  const subject = ship
    ? `Shipped · ${data.orderNumber} · Simic Systems`
    : `Order confirmed · ${data.orderNumber} · Simic Systems`;
  const dateLabel = data.orderDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  });
  const preheader = ship
    ? `Your order is on its way via ${ship.carrier}. Tracking: ${ship.trackingNumber}`
    : `${itemCount} sealed ${itemCount === 1 ? "item" : "items"} confirmed — ${money(data.totalCents)}. We'll email tracking as soon as it ships.`;
  const name = greetingName ? escapeHtml(greetingName) : "";
  const hero = ship
    ? {
        eyebrow: "ORDER&nbsp;SHIPPED",
        line1: name ? `It's on the way, ${name}.` : "It's on the way.",
        line2: "Your packs just left the reef.",
        intro: `Your sealed ${itemCount === 1 ? "display is" : "displays are"} packed and handed to ${escapeHtml(ship.carrier)}. Tracking can take a few hours to show the first scan.`,
      }
    : {
        eyebrow: "ORDER&nbsp;CONFIRMED",
        line1: name ? `Thank you, ${name}.` : "Thank you.",
        line2: "Your packs are in good hands.",
        intro: "Every display ships factory sealed, straight from authorized Wizards of the Coast distribution. Here's your receipt &mdash; keep it handy.",
      };
  const address = addressLines(data.shippingAddress);
  const site = data.siteUrl.replace(/\/$/, "");
  // Under /hotlink-ok/ so Cloudflare hotlink protection lets webmail clients
  // (Outlook, Yahoo) load it; elsewhere it 403s for non-Google referers.
  const logo = `${site}/hotlink-ok/email/logo.png`;

  const html = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700&family=JetBrains+Mono:wght@400;700&family=Libre+Caslon+Text:ital@0;1&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: dark; supported-color-schemes: dark; }
  body { margin:0; padding:0; background:${C.bg}; }
  a { color:${C.accent}; }
  @media (max-width: 620px) {
    .px { padding-left:20px !important; padding-right:20px !important; }
    .h1 { font-size:30px !important; line-height:36px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.bg};" bgcolor="${C.bg}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg};">${escapeHtml(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="background:${C.bg};background-image:radial-gradient(ellipse at top, #0c2a25 0%, ${C.bg} 60%);">
<tr><td align="center" style="padding:32px 12px 48px;">

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
    <!-- brand -->
    <tr><td align="center" style="padding:0 0 22px;">
      <a href="${site}" style="text-decoration:none;"><img src="${logo}" width="56" height="56" alt="Simic Systems" style="display:block;width:56px;height:56px;border:0;"></a>
      <div style="font-family:${FONT_MONO};font-size:11px;letter-spacing:4px;color:${C.muted};padding-top:12px;">SIMIC&nbsp;SYSTEMS</div>
    </td></tr>

    <!-- card -->
    <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:18px;overflow:hidden;" bgcolor="${C.card}">
      <!-- glow bar -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td height="4" style="height:4px;line-height:4px;font-size:0;background:${C.accent};background-image:linear-gradient(90deg, ${C.teal}, ${C.accent} 45%, ${C.bio});border-radius:18px 18px 0 0;">&nbsp;</td>
      </tr></table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <!-- hero -->
        <tr><td class="px" style="padding:36px 40px 8px;">
          <div style="font-family:${FONT_MONO};font-size:12px;letter-spacing:3px;color:${C.bio};">&#9679;&nbsp;${hero.eyebrow}</div>
          <h1 class="h1" style="margin:14px 0 0;font-family:${FONT_HEAD};font-weight:400;font-size:36px;line-height:42px;color:${C.text};">${hero.line1}<br><span style="color:${C.accent};font-style:italic;">${hero.line2}</span></h1>
          <p style="margin:16px 0 0;font-family:${FONT_BODY};font-size:15px;line-height:24px;color:${C.muted};">${hero.intro}</p>
        </td></tr>
${ship ? `
        <!-- tracking CTA -->
        <tr><td class="px" style="padding:24px 40px 4px;">${trackButton(ship)}</td></tr>` : ""}

        <!-- meta chips -->
        <tr><td class="px" style="padding:22px 40px 6px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="padding:8px 14px;border:1px solid ${C.line};border-radius:999px;background:${C.cardRaised};font-family:${FONT_MONO};font-size:12px;color:${C.text};white-space:nowrap;"><span style="color:${C.muted};">ORDER</span>&nbsp;&nbsp;${escapeHtml(data.orderNumber)}</td>
            <td width="8"></td>
            <td style="padding:8px 14px;border:1px solid ${C.line};border-radius:999px;background:${C.cardRaised};font-family:${FONT_MONO};font-size:12px;color:${C.text};white-space:nowrap;">${escapeHtml(dateLabel)}</td>
          </tr></table>
        </td></tr>

        <!-- items -->
        <tr><td class="px" style="padding:18px 40px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${data.items.map(itemRow).join("")}</table>
        </td></tr>

        ${ship ? `<tr><td style="padding:0 0 28px;font-size:0;line-height:0;">&nbsp;</td></tr>` : `<!-- totals -->
        <tr><td class="px" style="padding:14px 40px 30px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${totalRow("Subtotal", money(data.subtotalCents))}
            ${totalRow(data.shippingLabel, data.shippingCents ? money(data.shippingCents) : "Free")}
            ${data.taxCents ? totalRow("Tax", money(data.taxCents)) : ""}
            <tr><td colspan="2" style="padding-top:10px;border-bottom:1px solid ${C.line};font-size:0;line-height:0;">&nbsp;</td></tr>
            ${totalRow("Total paid", money(data.totalCents), { strong: true })}
          </table>
        </td></tr>`}

        <!-- tracker -->
        <tr><td class="px" style="padding:0 40px 28px;">${
          ship
            ? tracker(2, `Questions about delivery? Reply here &mdash; we keep the receipt, photos of your packed box, and the ${escapeHtml(ship.carrier)} drop-off scan.`)
            : tracker(0, "We pack orders within 1&ndash;3 business days. You'll get a tracking link the moment it ships.")
        }</td></tr>

        ${
          address.length
            ? `<!-- ship to -->
        <tr><td class="px" style="padding:0 40px 36px;">
          <div style="font-family:${FONT_MONO};font-size:11px;letter-spacing:3px;color:${C.muted};padding-bottom:8px;">SHIPPING&nbsp;TO</div>
          <div style="font-family:${FONT_BODY};font-size:15px;line-height:23px;color:${C.text};">${address.map(escapeHtml).join("<br>")}</div>
        </td></tr>`
            : ""
        }
      </table>
    </td></tr>

    <!-- footer -->
    <tr><td align="center" class="px" style="padding:28px 40px 0;font-family:${FONT_BODY};font-size:13px;line-height:21px;color:${C.muted};">
      Questions about your order? Just reply to this email,<br>or reach us at <a href="${site}/contact" style="color:${C.accent};text-decoration:none;">simic.systems/contact</a>.
      <div style="padding-top:18px;font-family:${FONT_MONO};font-size:11px;letter-spacing:1px;color:#55706a;">
        SIMIC SYSTEMS LLC &middot; SEALED MAGIC: THE GATHERING &middot; <a href="${site}" style="color:#55706a;text-decoration:none;">SIMIC.SYSTEMS</a>
      </div>
    </td></tr>
  </table>

</td></tr>
</table>
</body>
</html>`;

  if (ship) {
    const text = [
      `ORDER SHIPPED — ${data.orderNumber}`,
      "",
      `${greetingName ? `It's on the way, ${greetingName}.` : "It's on the way."} Your packs just left the reef.`,
      "",
      `Track your package (${ship.carrier} ${ship.trackingNumber}):`,
      ship.trackingUrl,
      "",
      ...data.items.map((i) => `${i.quantity} × ${i.name}`),
      "",
      ...(address.length ? ["Shipping to:", ...address, ""] : []),
      `Questions? Reply to this email or visit ${site}/contact`,
    ].join("\n");
    return { subject, html, text };
  }

  const text = [
    `ORDER CONFIRMED — ${data.orderNumber}`,
    "",
    greetingName ? `Thank you, ${greetingName}. Your packs are in good hands.` : "Thank you. Your packs are in good hands.",
    "",
    ...data.items.map((i) => `${i.quantity} × ${i.name} — ${money(i.amountCents)}`),
    "",
    `Subtotal: ${money(data.subtotalCents)}`,
    `${data.shippingLabel}: ${data.shippingCents ? money(data.shippingCents) : "Free"}`,
    ...(data.taxCents ? [`Tax: ${money(data.taxCents)}`] : []),
    `Total paid: ${money(data.totalCents)}`,
    "",
    ...(address.length ? ["Shipping to:", ...address, ""] : []),
    "We pack orders within 1–3 business days and email tracking as soon as it ships.",
    `Questions? Reply to this email or visit ${site}/contact`,
  ].join("\n");

  return { subject, html, text };
}
