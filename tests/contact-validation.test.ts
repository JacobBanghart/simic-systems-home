import { describe, it, expect } from "vitest";
import { isValidEmail, validateContact, buildRawEmail, VALID_SUBJECTS } from "../src/lib/contact";

describe("isValidEmail", () => {
  it("accepts valid emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("name+tag@domain.co.uk")).toBe(true);
  });

  it("rejects emails without @", () => {
    expect(isValidEmail("userexample.com")).toBe(false);
  });

  it("rejects emails without domain", () => {
    expect(isValidEmail("user@")).toBe(false);
  });

  it("rejects emails with spaces", () => {
    expect(isValidEmail("user @example.com")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });
});

describe("validateContact", () => {
  const valid = {
    name: "John",
    email: "john@example.com",
    subject: "Order Question",
    message: "Where is my order?",
  };

  it("returns no errors for valid input", () => {
    expect(validateContact(valid)).toEqual([]);
  });

  it("requires name", () => {
    const errors = validateContact({ ...valid, name: "" });
    expect(errors).toContain("Name is required");
  });

  it("requires email", () => {
    const errors = validateContact({ ...valid, email: "" });
    expect(errors).toContain("Email is required");
  });

  it("validates email format", () => {
    const errors = validateContact({ ...valid, email: "not-an-email" });
    expect(errors).toContain("Invalid email format");
  });

  it("requires subject", () => {
    const errors = validateContact({ ...valid, subject: "" });
    expect(errors).toContain("Subject is required");
  });

  it("rejects invalid subject", () => {
    const errors = validateContact({ ...valid, subject: "Spam" });
    expect(errors).toContain("Invalid subject");
  });

  it("accepts all valid subjects", () => {
    for (const subject of VALID_SUBJECTS) {
      expect(validateContact({ ...valid, subject })).toEqual([]);
    }
  });

  it("requires message", () => {
    const errors = validateContact({ ...valid, message: "" });
    expect(errors).toContain("Message is required");
  });

  it("trims whitespace-only fields", () => {
    const errors = validateContact({ ...valid, name: "   ", message: " \t " });
    expect(errors).toContain("Name is required");
    expect(errors).toContain("Message is required");
  });

  it("returns multiple errors at once", () => {
    const errors = validateContact({ name: "", email: "", subject: "", message: "" });
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });
});

describe("buildRawEmail", () => {
  const submission = {
    name: "Jane Doe",
    email: "jane@example.com",
    subject: "Product Inquiry",
    message: "Is this product sealed?",
  };

  it("includes From header", () => {
    const email = buildRawEmail(submission);
    expect(email).toContain("From: noreply@simic.systems");
  });

  it("includes To header", () => {
    const email = buildRawEmail(submission);
    expect(email).toContain("To: contact@simic.systems");
  });

  it("includes Reply-To header with submitter email", () => {
    const email = buildRawEmail(submission);
    expect(email).toContain("Reply-To: jane@example.com");
  });

  it("includes subject with prefix", () => {
    const email = buildRawEmail(submission);
    expect(email).toContain("Subject: [Contact Form] Product Inquiry");
  });

  it("includes message body", () => {
    const email = buildRawEmail(submission);
    expect(email).toContain("Is this product sealed?");
  });

  it("includes submission metadata in body", () => {
    const email = buildRawEmail(submission);
    expect(email).toContain("Name: Jane Doe");
    expect(email).toContain("Email: jane@example.com");
  });

  it("uses CRLF line endings", () => {
    const email = buildRawEmail(submission);
    expect(email).toContain("\r\n");
    expect(email).not.toMatch(/[^\r]\n/); // no bare LF
  });
});
