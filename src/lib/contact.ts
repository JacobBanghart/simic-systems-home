export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
}

export function validateContact(body: ContactPayload): string[] {
  const errors: string[] = [];
  if (!body.name?.trim()) errors.push("Name is required");
  if (!body.email?.trim()) errors.push("Email is required");
  else if (!isValidEmail(body.email)) errors.push("Invalid email format");
  if (!body.subject?.trim()) errors.push("Subject is required");
  else if (!VALID_SUBJECTS.includes(body.subject as (typeof VALID_SUBJECTS)[number]))
    errors.push("Invalid subject");
  if (!body.message?.trim()) errors.push("Message is required");
  return errors;
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
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    `New contact form submission:`,
    ``,
    `Name: ${submission.name}`,
    `Email: ${submission.email}`,
    `Subject: ${submission.subject}`,
    ``,
    submission.message,
  ];
  return lines.join("\r\n");
}
