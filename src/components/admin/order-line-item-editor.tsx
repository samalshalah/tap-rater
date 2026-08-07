"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { canMarkLineItemReadyForPrint, type OrderLineItem } from "@/lib/order-line-items";

export function OrderLineItemEditor({ stripeCheckoutSessionId, lineItemIndex, item }: { stripeCheckoutSessionId: string; lineItemIndex: number; item: OrderLineItem }) {
  const router = useRouter();
  const [logoReference, setLogoReference] = useState(item.logoReference ?? "");
  const [proofApproved, setProofApproved] = useState(item.proofApproved === true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const canMarkReady = canMarkLineItemReadyForPrint({
    logoRequired: item.logoRequired,
    logoReference,
    proofRequired: item.proofRequired,
    proofApproved
  });

  async function save(patch: { logoReference?: string; proofApproved?: boolean; readyForPrint?: boolean }) {
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/admin/orders/line-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stripeCheckoutSessionId, lineItemIndex, ...patch })
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error ?? "Update failed.");
      }

      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Update failed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-2 grid gap-2 rounded-md border border-line bg-gray-50 p-2 text-xs leading-5 text-ink">
      <p>
        <strong>Logo required:</strong> {item.logoRequired ? "Yes" : "No"}
      </p>
      {item.logoRequired ? (
        <label className="grid gap-1">
          <span className="font-bold">Logo reference (filename, email note, etc.)</span>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-line bg-white px-2 py-1.5"
              value={logoReference}
              onChange={(event) => setLogoReference(event.target.value)}
              placeholder="e.g. received via email, saved as google-nova-logo.png"
              disabled={isSaving}
            />
            <button
              type="button"
              className="rounded-md bg-ink px-3 py-1.5 font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
              disabled={isSaving}
              onClick={() => save({ logoReference })}
            >
              Save
            </button>
          </div>
        </label>
      ) : (
        <p className="text-muted">Not required</p>
      )}

      <p className="mt-1">
        <strong>Proof required:</strong> {item.proofRequired ? "Yes" : "No"}
      </p>
      {item.proofRequired ? (
        <label className="flex items-center gap-2 font-bold">
          <input
            type="checkbox"
            checked={proofApproved}
            disabled={isSaving}
            onChange={(event) => {
              setProofApproved(event.target.checked);
              save({ proofApproved: event.target.checked });
            }}
          />
          Proof approved
        </label>
      ) : (
        <p className="text-muted">Not required</p>
      )}

      <div className="mt-2 border-t border-line pt-2">
        {item.readyForPrint ? (
          <p className="font-black text-brand">Ready for print</p>
        ) : (
          <>
            <button
              type="button"
              className="rounded-md bg-ink px-3 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
              disabled={isSaving || !canMarkReady}
              onClick={() => save({ readyForPrint: true })}
            >
              Mark ready for print
            </button>
            {!canMarkReady ? (
              <p className="mt-1 font-black text-amber-700">Do not print until logo/design is collected and proof is approved.</p>
            ) : null}
          </>
        )}
      </div>

      {error ? <p className="font-bold text-red-600">{error}</p> : null}
    </div>
  );
}
