import type { APIRoute } from "astro";
import { EmailMessage } from "cloudflare:email";
import { env } from "cloudflare:workers";
import { validateContact, buildRawEmail, type ContactPayload } from "../../lib/contact";
import { getPostHogServer } from "../../lib/posthog-server";

export const prerender = false;

const RATE_LIMIT_WINDOW_SECONDS = 300; // 5 minutes
const RATE_LIMIT_MAX = 3; // max submissions per window per IP

export const POST: APIRoute = async ({ request, locals }) => {
  // Rate limiting via KV
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const rateLimitKey = `ratelimit:contact:${ip}`;
  try {
    const current = parseInt((await env.PRODUCT_CACHE.get(rateLimitKey)) || "0", 10);
    if (current >= RATE_LIMIT_MAX) {
      return new Response(
        JSON.stringify({ error: "Too many submissions. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
    await env.PRODUCT_CACHE.put(rateLimitKey, String(current + 1), {
      expirationTtl: RATE_LIMIT_WINDOW_SECONDS,
    });
  } catch {
    // If rate limiting fails, allow the request through
  }

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
    return new Response(JSON.stringify({ error: "Failed to submit. Please try again." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sessionId = request.headers.get("X-PostHog-Session-Id") || undefined;
  const distinctId =
    request.headers.get("X-PostHog-Distinct-Id") || `anonymous-contact-${Date.now()}`;
  const posthog = getPostHogServer();
  posthog.capture({
    distinctId,
    event: "contact_message_sent",
    properties: {
      $session_id: sessionId,
      subject: submission.subject,
      source: "api",
    },
  });
  locals.cfContext.waitUntil(posthog.flush());

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
