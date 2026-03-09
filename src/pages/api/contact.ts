import type { APIRoute } from "astro";
import { EmailMessage } from "cloudflare:email";
import { validateContact, buildRawEmail, type ContactPayload } from "../../lib/contact";

export const prerender = false;

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

  const errors = validateContact(body);
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
