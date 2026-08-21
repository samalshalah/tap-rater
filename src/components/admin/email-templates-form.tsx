"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import {
  defaultEmailTemplates,
  emailTemplateKeys,
  type EmailTemplateKey,
  type EmailTemplateSettings
} from "@/lib/email-template-config";

type EmailTemplatesFormProps = {
  initialTemplates: EmailTemplateSettings[];
};

export function EmailTemplatesForm({ initialTemplates }: EmailTemplatesFormProps) {
  const initialByKey = useMemo(() => {
    return Object.fromEntries(initialTemplates.map((template) => [template.key, template])) as Record<EmailTemplateKey, EmailTemplateSettings>;
  }, [initialTemplates]);
  const [templates, setTemplates] = useState<Record<EmailTemplateKey, EmailTemplateSettings>>({
    ...defaultEmailTemplates,
    ...initialByKey
  });
  const [selectedKey, setSelectedKey] = useState<EmailTemplateKey>("customer-order-confirmation");
  const [testRecipient, setTestRecipient] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const selected = templates[selectedKey];

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          key: selected.key,
          enabled: selected.enabled,
          subject: selected.subject,
          introText: selected.introText,
          supportText: selected.supportText,
          footerText: selected.footerText
        })
      });
      const data = (await response.json().catch(() => null)) as { error?: string; template?: EmailTemplateSettings } | null;

      if (!response.ok || !data?.template) {
        throw new Error(data?.error ?? "Email template could not be saved.");
      }

      setTemplates((current) => ({ ...current, [data.template!.key]: data.template! }));
      setMessage("Email template saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Email template could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function sendTestEmail() {
    setIsSendingTest(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/email-templates/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          key: selected.key,
          to: testRecipient || undefined
        })
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Test email could not be sent.");
      }

      setMessage("Test email sent.");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Test email could not be sent.");
    } finally {
      setIsSendingTest(false);
    }
  }

  function updateSelected(updates: Partial<EmailTemplateSettings>) {
    setTemplates((current) => ({
      ...current,
      [selectedKey]: {
        ...current[selectedKey],
        ...updates
      }
    }));
  }

  function resetSelected() {
    setTemplates((current) => ({
      ...current,
      [selectedKey]: defaultEmailTemplates[selectedKey]
    }));
    setMessage("Template reset locally. Save to persist the default.");
    setError(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-2">
        {emailTemplateKeys.map((key) => {
          const template = templates[key];
          const isSelected = key === selectedKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSelectedKey(key);
                setMessage(null);
                setError(null);
              }}
              className={`w-full rounded-md border p-4 text-left text-sm transition ${
                isSelected ? "border-brand bg-white shadow-sm" : "border-line bg-white/70 hover:border-brand"
              }`}
            >
              <span className="block font-black text-ink">{template.label}</span>
              <span className="mt-1 block leading-5 text-muted">{template.description}</span>
              <span className={`mt-3 inline-flex rounded-full px-2 py-1 text-[11px] font-black uppercase ${template.enabled ? "bg-brand/10 text-brand" : "bg-muted/10 text-muted"}`}>
                {template.enabled ? "Enabled" : "Disabled"}
              </span>
            </button>
          );
        })}
      </aside>

      <form onSubmit={saveTemplate} className="space-y-6">
        <div className="rounded-md border border-line bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-ink">{selected.label}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{selected.description}</p>
            </div>
            <label className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-bold text-ink">
              <input type="checkbox" checked={selected.enabled} onChange={(event) => updateSelected({ enabled: event.target.checked })} />
              Enabled
            </label>
          </div>

          <div className="mt-5 grid gap-4">
            <TextField label="Subject" value={selected.subject} onChange={(value) => updateSelected({ subject: value })} />
            <TextArea label="Intro text" value={selected.introText} onChange={(value) => updateSelected({ introText: value })} />
            <TextArea label="Support text" value={selected.supportText} onChange={(value) => updateSelected({ supportText: value })} />
            <TextArea label="Footer text" value={selected.footerText} onChange={(value) => updateSelected({ footerText: value })} />
          </div>

          <p className="mt-4 rounded-md bg-[#f7f8fa] p-3 text-xs font-bold leading-5 text-muted">
            Structured order, request, setup, shipping, policy, and Stripe reference fields are generated automatically. Raw HTML editing is intentionally disabled.
            Customer and admin paid-order emails remain operational even if the toggle is off, so payment webhooks cannot silently suppress launch-critical notifications.
          </p>
        </div>

        <div className="rounded-md border border-line bg-white p-5 shadow-sm">
          <h3 className="text-lg font-black text-ink">Preview</h3>
          <div className="mt-4 rounded-md border border-line bg-[#f7f8fa] p-4 text-sm leading-6 text-ink">
            <p className="font-black">Subject: {selected.subject}</p>
            {selected.introText ? <p className="mt-3">{selected.introText}</p> : null}
            <PreviewContent templateKey={selected.key} />
            {selected.supportText ? <p className="mt-3">{selected.supportText}</p> : null}
            {selected.footerText ? <p className="mt-3 text-muted">{selected.footerText}</p> : null}
          </div>
        </div>

        <div className="rounded-md border border-line bg-white p-5 shadow-sm">
          <h3 className="text-lg font-black text-ink">Send test</h3>
          <p className="mt-1 text-sm text-muted">Sends sample data only. Leave blank to send to the configured admin email.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              value={testRecipient}
              onChange={(event) => setTestRecipient(event.target.value)}
              type="email"
              placeholder="optional-test@example.com"
              className="min-w-0 flex-1 rounded-md border border-line px-3 py-2 text-sm"
            />
            <button type="button" onClick={sendTestEmail} disabled={isSendingTest} className="rounded-md border border-line px-4 py-2 text-sm font-black text-ink disabled:opacity-60">
              {isSendingTest ? "Sending..." : "Send test"}
            </button>
          </div>
        </div>

        <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-white p-4 shadow-lg">
          <div className="text-sm">
            {message ? <p className="font-bold text-brand">{message}</p> : null}
            {error ? <p className="font-bold text-red-600">{error}</p> : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={resetSelected} className="rounded-md border border-line px-5 py-3 text-sm font-black text-ink">
              Reset to default
            </button>
            <button type="submit" disabled={isSaving} className="rounded-md bg-ink px-5 py-3 text-sm font-black text-white disabled:opacity-60">
              {isSaving ? "Saving..." : "Save email template"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-bold text-ink">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm" />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-bold text-ink">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm" />
    </label>
  );
}

function PreviewContent({ templateKey }: { templateKey: EmailTemplateKey }) {
  if (templateKey === "admin-new-order") {
    return (
      <div className="mt-3 space-y-1">
        <p>Order reference: order_123</p>
        <p>Customer email: buyer@example.com</p>
        <p>Total: $49.00</p>
        <p>Option: Branded + QR Direct</p>
        <p>Logo reference: products/customer-logo.png</p>
        <p>QR value: https://example.com/menu</p>
      </div>
    );
  }

  if (templateKey === "support-request") {
    return (
      <div className="mt-3 space-y-1">
        <p>Name: QA Customer</p>
        <p>Email: customer@example.com</p>
        <p>Message: I need help with my Tap Rater order.</p>
      </div>
    );
  }

  if (templateKey === "shipping-tracking") {
    return (
      <div className="mt-3 space-y-1">
        <p>Order reference: order_123</p>
        <p>Carrier: USPS</p>
        <p>Tracking number: 9400 0000 0000 0000 0000 00</p>
        <p>Note: This template is not sent automatically in Phase 1C.</p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-1">
      <p>Order reference: order_123</p>
      <p>Status: Paid</p>
      <p>Total: $39.00</p>
      <p>1 x Google Review Stand - Standard Direct - $39.00</p>
      <p>Destination URL: https://example.com/review</p>
      <p>Connection: NFC only; No printed QR</p>
      <p>Support: https://taprater.com/support</p>
      <p>Shipping: https://taprater.com/shipping</p>
      <p>Refund Policy: https://taprater.com/refund-policy</p>
      <p>Terms: https://taprater.com/terms</p>
    </div>
  );
}
