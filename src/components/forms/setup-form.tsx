"use client";

import { type FormEvent, useState } from "react";
import { FormSecurity, useFormSecurity } from "@/components/forms/form-security";

export function SetupForm() {
  const security = useFormSecurity();
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !security.token) return;
    setIsSubmitting(true);
    setStatus("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/forms/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          businessName: form.get("businessName"),
          reviewUrl: form.get("reviewUrl"),
          notes: form.get("notes") ?? "",
          companyWebsite: form.get("companyWebsite"),
          turnstileToken: security.token
        })
      });
      const body = await response.json();
      setStatusType(response.ok ? "success" : "error");
      setStatus(response.ok ? "Setup request sent." : body.error ?? "Setup request failed.");
    } catch {
      setStatusType("error");
      setStatus("Unable to send your request. Check your connection and try again.");
    } finally {
      security.reset();
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
        Business name
        <input className="tr-input" name="businessName" autoComplete="organization" required />
      </label>
      <label className="tr-field-label">
        Destination URL
        <input className="tr-input" name="reviewUrl" type="url" placeholder="Google, Facebook, Yelp, or feedback URL" required />
      </label>
      <label className="tr-field-label">
        Notes
        <textarea className="tr-textarea min-h-28" name="notes" placeholder="Product, color, or setup notes" />
      </label>
      <FormSecurity action="setup" attempt={security.attempt} onToken={security.setToken} />
      <button className="tr-button-secondary" disabled={isSubmitting || !security.token}>
        {isSubmitting ? "Sending..." : "Send setup request"}
      </button>
      {status ? <p className={statusType === "success" ? "tr-status-success" : "tr-status-error"} role="status">{status}</p> : null}
    </form>
  );
}
