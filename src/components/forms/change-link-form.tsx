"use client";

import { type FormEvent, useState } from "react";
import { FormSecurity, useFormSecurity } from "@/components/forms/form-security";

export function ChangeLinkForm() {
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
      const response = await fetch("/api/forms/change-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          tapraterId: form.get("tapraterId"),
          newReviewUrl: form.get("newReviewUrl"),
          notes: form.get("notes") ?? "",
          companyWebsite: form.get("companyWebsite"),
          turnstileToken: security.token
        })
      });
      const body = await response.json();
      setStatusType(response.ok ? "success" : "error");
      setStatus(response.ok ? "Change request sent." : body.error ?? "Change request failed.");
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
        Tap Rater ID or product SKU
        <input className="tr-input" name="tapraterId" required />
      </label>
      <label className="tr-field-label">
        New review or feedback URL
        <input className="tr-input" name="newReviewUrl" type="url" required />
      </label>
      <label className="tr-field-label">
        Notes
        <textarea className="tr-textarea min-h-28" name="notes" />
      </label>
      <FormSecurity action="change-link" attempt={security.attempt} onToken={security.setToken} />
      <button className="tr-button-secondary" disabled={isSubmitting || !security.token}>
        {isSubmitting ? "Sending..." : "Send change request"}
      </button>
      {status ? <p className={statusType === "success" ? "tr-status-success" : "tr-status-error"} role="status">{status}</p> : null}
    </form>
  );
}
