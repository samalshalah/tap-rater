"use client";

import { Mail, ShieldCheck, ShieldOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminButton } from "@/components/admin/admin-ui";

export function CustomerAccessControl({
  customerId,
  accountStatus,
  canReactivate
}: {
  customerId: string;
  accountStatus: string;
  canReactivate: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const disabling = accountStatus === "active";
  const disabled = saving || (!disabling && !canReactivate);

  async function resendActivation() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/customers/${encodeURIComponent(customerId)}/activation`, {
        method: "POST"
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "The activation email could not be sent.");
      setMessage("Activation email sent.");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "The activation email could not be sent.");
    } finally {
      setSaving(false);
    }
  }

  async function updateAccess() {
    if (
      disabling &&
      !window.confirm("Disable this customer's account access? Existing sessions will be rejected immediately.")
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/customers/${encodeURIComponent(customerId)}/access`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: disabling ? "disabled" : "active" })
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "Customer access could not be updated.");
      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Customer access could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  if (accountStatus === "pending_activation") {
    return (
      <div className="grid justify-items-start gap-2">
        <AdminButton
          type="button"
          variant="outline"
          disabled={saving}
          loading={saving}
          onClick={resendActivation}
          className="min-h-9 px-3 py-1.5 text-xs"
        >
          <Mail aria-hidden="true" className="h-4 w-4" />
          Resend activation
        </AdminButton>
        {message ? <span className="max-w-52 text-xs leading-5 text-brand">{message}</span> : null}
        {error ? <span className="max-w-52 text-xs leading-5 text-red-700">{error}</span> : null}
      </div>
    );
  }

  if (accountStatus !== "active" && accountStatus !== "disabled") {
    return <span className="text-xs text-muted">Awaiting activation</span>;
  }

  return (
    <div className="grid justify-items-start gap-2">
      <AdminButton
        type="button"
        variant={disabling ? "danger" : "outline"}
        disabled={disabled}
        loading={saving}
        onClick={updateAccess}
        className="min-h-9 px-3 py-1.5 text-xs"
        title={!disabling && !canReactivate ? "The customer must complete account activation first." : undefined}
      >
        {disabling ? (
          <ShieldOff aria-hidden="true" className="h-4 w-4" />
        ) : (
          <ShieldCheck aria-hidden="true" className="h-4 w-4" />
        )}
        {disabling ? "Disable access" : canReactivate ? "Reactivate" : "Activation required"}
      </AdminButton>
      {error ? <span className="max-w-52 text-xs leading-5 text-red-700">{error}</span> : null}
    </div>
  );
}
