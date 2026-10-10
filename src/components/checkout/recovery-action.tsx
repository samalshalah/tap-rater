"use client";
import { useState } from "react";
export function RecoveryAction({ token, unsubscribe = false }: { token: string; unsubscribe?: boolean }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function submit() {
    setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/checkout/recover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action: unsubscribe ? "unsubscribe" : "pay" }) });
      const result = await r.json(); if (!r.ok) throw new Error(result.error);
      if (unsubscribe) setMessage("You will no longer receive checkout reminders from Tap Rater.");
      else if (typeof result.url === "string" && new URL(result.url).origin === "https://checkout.stripe.com") window.location.assign(result.url);
      else throw new Error("Payment link could not be verified. Please contact support.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again or contact support."); }
    finally { setBusy(false); }
  }
  return <div className="mt-6"><button className="tr-button-primary min-h-12 w-full" disabled={busy || (unsubscribe && !!message)} onClick={submit}>{busy ? "Please wait…" : unsubscribe ? "Stop checkout reminders" : "Continue to secure payment"}</button><p role="status" className="mt-4 text-sm">{message}</p></div>;
}
