"use client";

import { useState } from "react";
import { AdminButton } from "./admin-ui";

export function CustomerActivationButton({ customerId }: { customerId: string }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    if (sending || sent) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/customers/${encodeURIComponent(customerId)}/activation`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Activation email could not be sent.");
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Activation email could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return <div className="mt-2 max-w-xs">
    <AdminButton type="button" className="min-h-9 px-3 py-1.5 text-xs" disabled={sending || sent} onClick={send}>
      {sending ? "Sending..." : sent ? "Activation email sent" : "Send activation email"}
    </AdminButton>
    {sent && <p role="status" className="mt-1 text-xs text-brand">Activation email sent.</p>}
    {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
  </div>;
}
