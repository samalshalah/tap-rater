"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import type { ShippingSettingsInput } from "@/lib/validators";
import { AdminAlert, AdminButton, AdminCard, AdminInput, AdminSelect, AdminTextarea } from "./admin-ui";

type ShippingSettingsFormProps = {
  settings: ShippingSettingsInput;
};

export function ShippingSettingsForm({ settings }: ShippingSettingsFormProps) {
  const [form, setForm] = useState({
    ...settings,
    flatShippingAmount: (settings.flatShippingAmountCents / 100).toFixed(2),
    allowedCountryCodesText: settings.allowedCountryCodes.join(", ")
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    const payload: ShippingSettingsInput = {
      shippingMode: form.shippingMode,
      flatShippingAmountCents: Math.round(Number(form.flatShippingAmount || 0) * 100),
      allowedCountryCodes: form.allowedCountryCodesText
        .split(",")
        .map((code) => code.trim().toUpperCase())
        .filter(Boolean),
      handlingTimeText: form.handlingTimeText,
      supportedRegionsText: form.supportedRegionsText,
      defaultCarrierNotes: form.defaultCarrierNotes,
      customerFacingShippingNote: form.customerFacingShippingNote
    };

    try {
      const response = await fetch("/api/admin/shipping", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Shipping settings could not be saved.");
      }

      setMessage("Shipping settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Shipping settings could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <AdminCard title="Checkout shipping" description="Manual mode collects the address but does not add a shipping fee.">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm font-semibold text-ink">
            Shipping mode
            <AdminSelect
              value={form.shippingMode}
              onChange={(event) => setForm((current) => ({ ...current, shippingMode: event.target.value as ShippingSettingsInput["shippingMode"] }))}
              className="mt-2"
            >
              <option value="manual">Manual review</option>
              <option value="free">Free shipping</option>
              <option value="flat">Flat rate</option>
            </AdminSelect>
          </label>

          <TextField
            label="Flat amount"
            value={form.flatShippingAmount}
            onChange={(value) => setForm((current) => ({ ...current, flatShippingAmount: value }))}
            placeholder="0.00"
          />

          <TextField
            label="Allowed countries"
            value={form.allowedCountryCodesText}
            onChange={(value) => setForm((current) => ({ ...current, allowedCountryCodesText: value }))}
            placeholder="US"
          />
        </div>
      </AdminCard>

      <AdminCard title="Fulfillment notes">
        <div className="grid gap-4 md:grid-cols-2">
          <TextArea
            label="Handling time"
            value={form.handlingTimeText}
            onChange={(value) => setForm((current) => ({ ...current, handlingTimeText: value }))}
            placeholder="Example: Usually ships after production review."
          />
          <TextArea
            label="Supported regions"
            value={form.supportedRegionsText}
            onChange={(value) => setForm((current) => ({ ...current, supportedRegionsText: value }))}
            placeholder="United States"
          />
          <TextArea
            label="Default carrier notes"
            value={form.defaultCarrierNotes}
            onChange={(value) => setForm((current) => ({ ...current, defaultCarrierNotes: value }))}
            placeholder="USPS, UPS, or carrier selected during fulfillment."
          />
          <TextArea
            label="Customer-facing shipping note"
            value={form.customerFacingShippingNote}
            onChange={(value) => setForm((current) => ({ ...current, customerFacingShippingNote: value }))}
            placeholder="Shown internally for now and ready for customer surfaces."
          />
        </div>
      </AdminCard>

      <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-white p-4 shadow-lg">
        <div className="text-sm">
          {message ? <AdminAlert tone="success">{message}</AdminAlert> : null}
          {error ? <AdminAlert tone="danger">{error}</AdminAlert> : null}
        </div>
        <AdminButton type="submit" disabled={isSaving} loading={isSaving} variant="primary">
          {isSaving ? "Saving..." : "Save shipping settings"}
        </AdminButton>
      </div>
    </form>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-ink">
      {label}
      <AdminInput value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2" />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-ink">
      {label}
      <AdminTextarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="mt-2"
      />
    </label>
  );
}
