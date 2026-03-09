import type { APIRoute } from "astro";
import { EmailMessage } from "cloudflare:email";

export const prerender = false;

interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  _honey?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const VALID_SUBJECTS = [
  "Order Question",
  "Product Inquiry",
  "Returns/Refunds",
  "Other",
];

function buildRawEmail(submission: {
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

export const POST: APIRoute = async ({ request, locals }) => {
  const { env } = locals.runtime;

  let body: ContactPayload;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Honeypot check
  if (body._honey) {
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validation
  const errors: string[] = [];
  if (!body.name?.trim()) errors.push("Name is required");
  if (!body.email?.trim()) errors.push("Email is required");
  else if (!isValidEmail(body.email)) errors.push("Invalid email format");
  if (!body.subject?.trim()) errors.push("Subject is required");
  else if (!VALID_SUBJECTS.includes(body.subject))
    errors.push("Invalid subject");
  if (!body.message?.trim()) errors.push("Message is required");

  if (errors.length > 0) {
    return new Response(JSON.stringify({ error: errors.join(", ") }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const submission = {
    name: body.name.trim(),
    email: body.email.trim(),
    subject: body.subject.trim(),
    message: body.message.trim(),
  };

  try {
    const rawEmail = buildRawEmail(submission);
    const msg = new EmailMessage(
      "noreply@simic.systems",
      "contact@simic.systems",
      new Blob([rawEmail]).stream()
    );
    await env.CONTACT_EMAIL.send(msg);
  } catch (err) {
    console.error("Failed to send contact email:", err);
    return new Response(
      JSON.stringify({ error: "Failed to submit. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
