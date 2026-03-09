import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Alert,
  ThemeProvider,
} from "@mui/material";
import { themeOptions } from "./theme";

const SUBJECTS = [
  "Order Question",
  "Product Inquiry",
  "Returns/Refunds",
  "Other",
];

function ContactFormContent() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [honey, setHoney] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/contact/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message, _honey: honey }),
      });
      const data: { success?: boolean; error?: string } = await res.json();

      if (!res.ok) {
        setResult({ type: "error", text: data.error || "Something went wrong" });
        return;
      }

      setResult({ type: "success", text: "Message sent! We'll get back to you within 1-2 business days." });
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch {
      setResult({ type: "error", text: "Failed to send. Please try again or email us directly." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Honeypot - hidden from users */}
      <input
        type="text"
        name="_honey"
        value={honey}
        onChange={(e) => setHoney(e.target.value)}
        style={{ position: "absolute", left: "-9999px", opacity: 0 }}
        tabIndex={-1}
        autoComplete="off"
      />

      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        size="small"
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
      />

      {result && (
        <Alert severity={result.type} onClose={() => setResult(null)}>
          {result.text}
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        disabled={loading}
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
      <ContactFormContent />
    </ThemeProvider>
  );
}
