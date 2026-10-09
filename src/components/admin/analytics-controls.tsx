"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AnalyticsControls({
  orderId,
  excluded,
}: {
  orderId?: string;
  excluded?: boolean;
}) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function run() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          orderId
            ? { action: "order-exclusion", orderId, excluded: !excluded }
            : { action: "exclude-browser" },
        ),
      });
      if (!res.ok) throw new Error();
      setMessage(
        orderId ? "Updated" : "This browser is excluded from future analytics.",
      );
      router.refresh();
    } catch {
      setMessage("Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="tr-button-outline text-sm"
      >
        {busy
          ? "Saving…"
          : orderId
            ? excluded
              ? "Include order"
              : "Exclude test order"
            : "Exclude this testing browser"}
      </button>
      {message ? (
        <p role="status" className="mt-2 text-sm text-muted">
          {message}
        </p>
      ) : null}
    </div>
  );
}
