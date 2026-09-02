"use client";

import { type FormEvent, useState } from "react";

export function ContactForm() {
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/forms/contact", {
        method: "POST",
        body: form
      });
      const body = await response.json();
      setStatusType(response.ok ? "success" : "error");
      setStatus(response.ok ? "Message sent." : body.error ?? "Message failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <label className="tr-field-label">
        Name
        <input className="tr-input" name="name" autoComplete="name" required />
      </label>
      <label className="tr-field-label">
        Email
        <input className="tr-input" name="email" type="email" autoComplete="email" required />
      </label>
      <label className="tr-field-label">
        Message
        <textarea className="tr-textarea" name="message" placeholder="Tell us what you need. For logo help, include the product name and what should be fixed." required />
      </label>
      <label className="tr-field-label">
        Logo or artwork file
        <input className="tr-input py-2" name="attachment" type="file" accept="image/png,image/jpeg,image/webp" />
        <span className="text-xs font-medium leading-5 text-muted">Optional. PNG, JPG, or WEBP up to 10 MB.</span>
      </label>
      <button className="tr-button-secondary" disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : "Send message"}
      </button>
      {status ? <p className={statusType === "success" ? "tr-status-success" : "tr-status-error"} role="status">{status}</p> : null}
    </form>
  );
}
