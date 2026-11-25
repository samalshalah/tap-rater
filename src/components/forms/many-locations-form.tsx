"use client";

import { type FormEvent, useState } from "react";
import { FormSecurity, useFormSecurity } from "@/components/forms/form-security";

/**
 * Request for Tap Rater to set up Multi-Link pages for a business with many locations.
 * Saved with the contact requests (Admin → Requests) and emailed to the team.
 */
export function ManyLocationsForm({ defaultBusiness = "" }: { defaultBusiness?: string }) {
  const security = useFormSecurity();
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !security.token) return;
    setIsSubmitting(true);
    setStatus(null);
    const fields = new FormData(event.currentTarget);
    const value = (key: string) => String(fields.get(key) ?? "").trim();
    const form = new FormData();
    form.set("name", value("name"));
    form.set("email", value("email"));
    form.set("topic", "many_locations");
    form.set("companyWebsite", value("companyWebsite"));
    form.set("turnstileToken", security.token);
    form.set("message", [
      "Multi-Link setup for many locations",
      `Business: ${value("business")}`,
      `Locations: ${value("locations")}`,
      `Stands in total: ${value("stands") || "Not sure yet"}`,
      `Phone: ${value("phone") || "Not given"}`,
      `Same logo for all locations: ${value("sameLogo") === "yes" ? "Yes" : value("sameLogo") === "no" ? "No, they are different businesses" : "Not sure"}`,
      "",
      value("notes") || "No other notes.",
    ].join("\n"));
    try {
      const response = await fetch("/api/forms/contact", { method: "POST", body: form });
      const body = await response.json().catch(() => ({}));
      setStatus(response.ok
        ? { type: "success", text: "Thank you. We'll email you within one business day to set up your locations." }
        : { type: "error", text: body.error ?? "Your request couldn't be sent. Try again." });
      if (response.ok) event.currentTarget.reset();
    } catch {
      setStatus({ type: "error", text: "Your request couldn't be sent. Check your connection and try again." });
    } finally {
      security.reset();
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="tr-field-label">Your name<input className="tr-input" name="name" autoComplete="name" minLength={2} maxLength={120} required /></label>
        <label className="tr-field-label">Email<input className="tr-input" name="email" type="email" autoComplete="email" maxLength={180} required /></label>
        <label className="tr-field-label">Phone (optional)<input className="tr-input" name="phone" type="tel" autoComplete="tel" maxLength={40} /></label>
        <label className="tr-field-label">Business or group name<input className="tr-input" name="business" defaultValue={defaultBusiness} maxLength={160} required /></label>
        <label className="tr-field-label">How many locations?<input className="tr-input" name="locations" type="number" min={2} max={1000} inputMode="numeric" required /></label>
        <label className="tr-field-label">Stands in total (optional)<input className="tr-input" name="stands" type="number" min={1} max={10000} inputMode="numeric" /></label>
      </div>
      <fieldset className="grid gap-2 text-sm">
        <legend className="tr-field-label">Do all locations use the same logo?</legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2"><input type="radio" name="sameLogo" value="yes" defaultChecked /> Yes, one brand</label>
          <label className="flex items-center gap-2"><input type="radio" name="sameLogo" value="no" /> No, different businesses</label>
          <label className="flex items-center gap-2"><input type="radio" name="sameLogo" value="unsure" /> Not sure</label>
        </div>
      </fieldset>
      <label className="tr-field-label">Anything else? (optional)
        <textarea className="tr-textarea" name="notes" maxLength={1500} placeholder="For example: a list of your locations, which links you want on each page, or when you need the stands." />
      </label>
      <FormSecurity action="contact" attempt={security.attempt} onToken={security.setToken} />
      <button className="tr-button-primary" disabled={isSubmitting || !security.token}>{isSubmitting ? "Sending…" : "Send request"}</button>
      {status ? <p className={status.type === "success" ? "tr-status-success" : "tr-status-error"} role="status">{status.text}</p> : null}
    </form>
  );
}
