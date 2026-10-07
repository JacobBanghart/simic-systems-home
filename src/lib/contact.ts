// Also excludes , ; < > " so a "Reply-To" built from it is exactly one address.
export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(email);
}

export const MAX_NAME_LENGTH = 100;
export const MAX_MESSAGE_LENGTH = 5000;

export const VALID_SUBJECTS = [
  "Order Question",
  "Product Inquiry",
  "Returns/Refunds",
  "Other",
] as const;

export interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  _honey?: string;
  turnstileToken?: string;
}

const str = (value: unknown): string => (typeof value === "string" ? value : "");

// Takes the raw parsed JSON: anything that isn't an object of strings is
// treated as missing fields (a null body or a numeric name used to throw and
// return a 500).
export function validateContact(raw: unknown): string[] {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const name = str(body.name).trim();
  const email = str(body.email).trim();
  const subject = str(body.subject).trim();
  const message = str(body.message).trim();
  const errors: string[] = [];
  if (!name) errors.push("Name is required");
  else if (name.length > MAX_NAME_LENGTH) errors.push(`Name must be ${MAX_NAME_LENGTH} characters or fewer`);
  if (!email) errors.push("Email is required");
  else if (!isValidEmail(email)) errors.push("Invalid email format");
  if (!subject) errors.push("Subject is required");
  else if (!VALID_SUBJECTS.includes(subject as (typeof VALID_SUBJECTS)[number]))
    errors.push("Invalid subject");
  if (!message) errors.push("Message is required");
  else if (message.length > MAX_MESSAGE_LENGTH)
    errors.push(`Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`);
  return errors;
}

// Cloudflare Turnstile server-side check. Returns true when the token is valid
// for this site.
export async function verifyTurnstile(secret: string, token: string, ip: string | null): Promise<boolean> {
  if (!token) return false;
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  if (!res.ok) return false;
  const outcome = (await res.json()) as { success?: boolean };
  return outcome.success === true;
}

export function buildRawEmail(submission: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): string {
  const lines = [
    `From: noreply@simic.systems`,
    `To: contact@simic.systems`,
    `Reply-To: ${submission.email}`,
    `Subject: [Contact Form] ${submission.subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@simic.systems>`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    `New contact form submission:`,
    ``,
    `Name: ${submission.name}`,
    `Email: ${submission.email}`,
    `Subject: ${submission.subject}`,
    ``,
    // The message's own newlines must be CRLF too (a bare LF is invalid in
    // the raw message), and SMTP caps lines at 998 octets.
    ...submission.message.split(/\r?\n/).flatMap(wrapLine),
  ];
  return lines.join("\r\n");
}

function wrapLine(line: string): string[] {
  const out: string[] = [];
  for (let rest = line; ; ) {
    if (rest.length <= 900) {
      out.push(rest);
      return out;
    }
    const cut = rest.lastIndexOf(" ", 900);
    const at = cut > 0 ? cut : 900;
    out.push(rest.slice(0, at));
    rest = rest.slice(cut > 0 ? at + 1 : at);
  }
}
