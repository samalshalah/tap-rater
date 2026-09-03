"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import type { TaxSettingsInput } from "@/lib/validators";
import { AdminAlert, AdminButton, AdminCard, AdminInput, AdminSelect, AdminTextarea } from "./admin-ui";

type TaxSettingsFormProps = {
  settings: TaxSettingsInput;
};

export function TaxSettingsForm({ settings }: TaxSettingsFormProps) {
  const [form, setForm] = useState({
    ...settings,
    manualTaxRatePercent: (settings.manualTaxRateBps / 100).toFixed(2).replace(/\.?0+$/, "")
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    const payload: TaxSettingsInput = {
      taxMode: form.taxMode,
      manualTaxRateBps: Math.round(Number(form.manualTaxRatePercent || 0) * 100),
      taxLabel: form.taxLabel,
      taxShipping: form.taxShipping,
      customerFacingTaxNote: form.customerFacingTaxNote
    };

    try {
      const response = await fetch("/api/admin/taxes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Tax settings could not be saved.");
      }

      setMessage("Tax settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Tax settings could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <AdminCard title="Checkout tax" description="Manual tax is shown before Stripe and sent to Stripe as a checkout line item. Stripe automatic tax is not enabled here.">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm font-medium text-ink">
            Tax mode
            <AdminSelect
              value={form.taxMode}
              onChange={(event) => setForm((current) => ({ ...current, taxMode: event.target.value as TaxSettingsInput["taxMode"] }))}
              className="mt-2"
            >
              <option value="manual">Manual website tax</option>
              <option value="disabled">No tax</option>
            </AdminSelect>
          </label>

          <TextField
            label="Tax rate"
            value={form.manualTaxRatePercent}
            onChange={(value) => setForm((current) => ({ ...current, manualTaxRatePercent: value }))}
            placeholder="6"
            suffix="%"
          />

          <TextField
            label="Customer label"
            value={form.taxLabel}
            onChange={(value) => setForm((current) => ({ ...current, taxLabel: value }))}
            placeholder="Virginia sales tax"
          />
        </div>

        <label className="mt-4 flex items-start gap-3 rounded-md border border-line bg-soft p-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={form.taxShipping}
            onChange={(event) => setForm((current) => ({ ...current, taxShipping: event.target.checked }))}
            className="mt-1 h-4 w-4 accent-brand"
          />
          <span>
            <span className="block font-medium">Apply tax to shipping</span>
            <span className="mt-1 block text-xs leading-5 text-muted">Leave off unless your accountant confirms shipping should be taxable for the order.</span>
          </span>
        </label>
      </AdminCard>

      <AdminCard title="Customer note">
        <TextArea
          label="Checkout note"
          value={form.customerFacingTaxNote}
          onChange={(value) => setForm((current) => ({ ...current, customerFacingTaxNote: value }))}
          placeholder="Estimated sales tax is calculated before payment."
        />
      </AdminCard>

      <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-white p-4 shadow-lg">
        <div className="text-sm">
          {message ? <AdminAlert tone="success">{message}</AdminAlert> : null}
          {error ? <AdminAlert tone="danger">{error}</AdminAlert> : null}
        </div>
        <AdminButton type="submit" disabled={isSaving} loading={isSaving} variant="primary">
          {isSaving ? "Saving..." : "Save tax settings"}
        </AdminButton>
      </div>
    </form>
  );
}

function TextField({
  label,
  onChange,
  placeholder,
  suffix,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suffix?: string;
  value: string;
}) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <div className="mt-2 flex items-center rounded-md border border-line bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
        <AdminInput value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="border-0 focus:ring-0" />
        {suffix ? <span className="px-3 text-sm text-muted">{suffix}</span> : null}
      </div>
    </label>
  );
}

function TextArea({
  label,
  onChange,
  placeholder,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <AdminTextarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} className="mt-2" />
    </label>
  );
}
