"use client";

import { type FormEvent, useState } from "react";
import { FormSecurity, useFormSecurity } from "@/components/forms/form-security";

export function ContactForm({ productFeedback = false }: { productFeedback?: boolean }) {
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
    if (productFeedback) {
      form.set("message", [
        "Product feedback — order and publication permission must be checked before publishing.",
        `Order number: ${String(form.get("orderNumber") ?? "")}`,
        `Product: ${String(form.get("productName") ?? "")}`,
        `Permission to publish feedback and first name: ${form.get("publishPermission") === "on" ? "Yes" : "No — private feedback only"}`,
        "",
        String(form.get("message") ?? "")
      ].join("\n"));
    }
    form.set("turnstileToken", security.token);
    try {
      const response = await fetch("/api/forms/contact", {
        method: "POST",
        body: form
      });
      const body = await response.json();
      setStatusType(response.ok ? "success" : "error");
      setStatus(response.ok ? (productFeedback ? "Thank you. Your feedback has been sent to our team for review." : "Message sent.") : body.error ?? "Message failed.");
    } catch {
      setStatusType("error");
      setStatus("Unable to send your message. Check your connection and try again.");
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
      {productFeedback ? <>
        <label className="tr-field-label">Order number<input className="tr-input" name="orderNumber" maxLength={100} required /></label>
        <label className="tr-field-label">Product name<input className="tr-input" name="productName" maxLength={120} required /></label>
      </> : null}
      <label className="tr-field-label">
        Message
        <textarea className="tr-textarea" name="message" minLength={10} maxLength={productFeedback ? 1200 : 2000} placeholder={productFeedback ? "How was the setup and everyday use? What worked well, and what could be better?" : "Tell us what you need. For logo help, include the product name and what should be fixed."} required />
      </label>
      {productFeedback ? <label className="flex items-start gap-3 text-sm leading-6 text-muted"><input type="checkbox" name="publishPermission" className="mt-1" /><span>Optional: Tap Rater may publish my feedback and first name on the website after checking my order. My email and order number must stay private.</span></label> : <label className="tr-field-label">
        Logo or artwork file
        <input className="tr-input py-2" name="attachment" type="file" accept="image/png,image/jpeg,image/webp" />
        <span className="text-xs font-medium leading-5 text-muted">Optional. PNG, JPG, or WEBP up to 10 MB.</span>
      </label>}
      <FormSecurity action="contact" attempt={security.attempt} onToken={security.setToken} />
      <button className="tr-button-secondary" disabled={isSubmitting || !security.token}>
        {isSubmitting ? "Sending..." : productFeedback ? "Send product feedback" : "Send message"}
      </button>
      {status ? <p className={statusType === "success" ? "tr-status-success" : "tr-status-error"} role="status">{status}</p> : null}
    </form>
  );
}
