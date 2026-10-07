import { useEffect, useRef, useState } from "react";
import { Box, TextField, Button, MenuItem, Alert, ThemeProvider } from "@mui/material";
import { themeOptions } from "./theme";
import { getPostHog, getPostHogHeaders } from "../lib/posthog-client";
import { ErrorBoundary } from "./ErrorBoundary";
import { TURNSTILE_SITE_KEY, TURNSTILE_TEST_SITE_KEY } from "../consts";

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId?: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_ENABLED = Boolean(TURNSTILE_SITE_KEY);

function turnstileSiteKey(): string {
  if (!TURNSTILE_SITE_KEY) return "";
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" ? TURNSTILE_TEST_SITE_KEY : TURNSTILE_SITE_KEY;
}

// Loads Cloudflare Turnstile once and renders the widget into `ref`; the token
// it produces is sent with the form and verified by /api/contact.
function useTurnstile(onToken: (token: string) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  useEffect(() => {
    const sitekey = turnstileSiteKey();
    if (!sitekey || !ref.current) return;
    const render = () => {
      if (!window.turnstile || !ref.current || widgetId.current) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey,
        theme: "dark",
        callback: onToken,
        "expired-callback": () => onToken(""),
      });
    };
    if (window.turnstile) {
      render();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [onToken]);
  const reset = () => {
    onToken("");
    window.turnstile?.reset(widgetId.current);
  };
  return [ref, reset] as const;
}

const SUBJECTS = ["Order Question", "Product Inquiry", "Returns/Refunds", "Other"];

function ContactFormContent() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [honey, setHoney] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileRef, resetTurnstile] = useTurnstile(setTurnstileToken);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const ph = getPostHog();

    try {
      const res = await fetch("/api/contact/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getPostHogHeaders(),
        },
        body: JSON.stringify({ name, email, subject, message, _honey: honey, turnstileToken }),
      });
      const data: { success?: boolean; error?: string } = await res.json();

      if (!res.ok) {
        setResult({ type: "error", text: data.error || "Something went wrong" });
        return;
      }

      ph?.capture("contact_form_submitted", { subject });
      setResult({
        type: "success",
        text: "Message sent! We'll get back to you within 1-2 business days.",
      });
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err) {
      setResult({ type: "error", text: "Failed to send. Please try again or email us directly." });
      ph?.captureException?.(err);
    } finally {
      setLoading(false);
      // Tokens are single-use: get a fresh one for any further submission.
      if (TURNSTILE_ENABLED) resetTurnstile();
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
    >
      {/* Honeypot - hidden from users. tabIndex/-9999px keep it out of Tab
          order, but screen readers navigating by virtual cursor (not Tab)
          can still land on it without aria-hidden. */}
      <input
        type="text"
        name="_honey"
        value={honey}
        onChange={(e) => setHoney(e.target.value)}
        style={{ position: "absolute", left: "-9999px", opacity: 0 }}
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
      />

      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        size="small"
        slotProps={{ htmlInput: { maxLength: 100 } }}
      />
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        size="small"
      />
      <TextField
        label="Subject"
        select
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        required
        size="small"
      >
        {SUBJECTS.map((s) => (
          <MenuItem key={s} value={s}>
            {s}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
        multiline
        rows={5}
        size="small"
        slotProps={{ htmlInput: { maxLength: 5000 } }}
      />

      {TURNSTILE_ENABLED && <div ref={turnstileRef} />}

      {result && (
        <Alert severity={result.type} onClose={() => setResult(null)}>
          {result.text}
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        disabled={loading || (TURNSTILE_ENABLED && !turnstileToken)}
        sx={{ textTransform: "none", alignSelf: "flex-start" }}
      >
        {loading ? "Sending..." : "Send Message"}
      </Button>
    </Box>
  );
}

export function ContactForm() {
  return (
    <ThemeProvider theme={themeOptions}>
      <ErrorBoundary>
        <ContactFormContent />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
