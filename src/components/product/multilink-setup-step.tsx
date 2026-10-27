"use client";
import { getHostedButtonMark, hostedPageButtonLimit, supportedHostedPageButtons, type HostedPageEditorButtonType } from "@/lib/hosted-page-editor-shared";
import { Plus, Trash2 } from "lucide-react";
import type { MultiLinkDraftButton } from "./product-setup-chooser-types";
import { createMultiLinkButtonId, formatPreviewUrl, getHostedButtonLabel, getHostedButtonSymbol } from "./product-setup-model";
export function MultiLinkSetupStep({
  businessName,
  buttons,
  onButtonsChange
}: {
  businessName: string;
  buttons: MultiLinkDraftButton[];
  onButtonsChange: (buttons: MultiLinkDraftButton[]) => void;
}) {
  const previewButtons = buttons
    .map((button, index) => ({
      ...button,
      label: button.label.trim() || getHostedButtonLabel(button.type),
      position: index
    }))
    .filter((button) => button.label || button.url.trim());

  function updateButton(id: string, patch: Partial<MultiLinkDraftButton>) {
    onButtonsChange(buttons.map((button) => (button.id === id ? { ...button, ...patch } : button)));
  }

  function addButton() {
    if (buttons.length >= hostedPageButtonLimit) return;
    const nextType = supportedHostedPageButtons.find((item) => !buttons.some((button) => button.type === item.type))?.type ?? "custom_link";
    onButtonsChange([
      ...buttons,
      {
        id: createMultiLinkButtonId(),
        type: nextType,
        label: getHostedButtonLabel(nextType),
        url: "",
        enabled: true,
        position: buttons.length
      }
    ]);
  }

  function removeButton(id: string) {
    onButtonsChange(buttons.filter((button) => button.id !== id).map((button, index) => ({ ...button, position: index })));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
      <div className="grid gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">Multi-Link page links</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Add the first links now to preview the customer page, or skip and finish them from your account after payment.
          </p>
        </div>

        <div className="grid gap-3">
          {buttons.map((button, index) => (
            <div key={button.id} className="grid gap-3 rounded-lg border border-line bg-white p-3 sm:grid-cols-[150px_minmax(0,1fr)_minmax(0,1.5fr)_auto] sm:items-end">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Icon
                <select
                  className="tr-input"
                  value={button.type}
                  onChange={(event) => {
                    const type = event.target.value as HostedPageEditorButtonType;
                    const previousDefaultLabel = getHostedButtonLabel(button.type);
                    updateButton(button.id, { type, label: !button.label.trim() || button.label.trim() === previousDefaultLabel ? getHostedButtonLabel(type) : button.label });
                  }}
                  aria-label={`Choose icon for link ${index + 1}`}
                >
                  {supportedHostedPageButtons.map((option) => (
                    <option key={option.type} value={option.type}>{getHostedButtonSymbol(option.type)} {option.label}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-ink">
                Button label
                <input
                  className="tr-input"
                  value={button.label}
                  onChange={(event) => updateButton(button.id, { label: event.target.value })}
                  placeholder={getHostedButtonLabel(button.type)}
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-ink">
                Link URL
                <input
                  className="tr-input"
                  type="url"
                  value={button.url}
                  onChange={(event) => updateButton(button.id, { url: event.target.value })}
                  placeholder="https://example.com"
                />
              </label>

              <button type="button" className="tr-icon-button" onClick={() => removeButton(button.id)} aria-label={`Remove link ${index + 1}`}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <button type="button" className="tr-button-outline w-full sm:w-fit" onClick={addButton} disabled={buttons.length >= hostedPageButtonLimit}>
          <Plus size={16} />
          Add link
        </button>
      </div>

      <MultiLinkMobilePreview businessName={businessName} buttons={previewButtons} />
    </div>
  );
}

export function MultiLinkMobilePreview({ businessName, buttons }: { businessName: string; buttons: MultiLinkDraftButton[] }) {
  return (
    <div className="rounded-2xl border border-line bg-ink p-2 shadow-sm lg:sticky lg:top-4">
      <div className="min-h-[520px] rounded-xl bg-white p-4">
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-line" aria-hidden="true" />
        <div className="grid justify-items-center gap-2 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand/10 text-xl font-black text-brand">
            {(businessName.trim()[0] ?? "T").toUpperCase()}
          </span>
          <p className="text-lg font-black leading-6 text-ink">{businessName.trim() || "Your business"}</p>
          <p className="max-w-[190px] text-sm leading-6 text-muted">Choose the link you need below.</p>
        </div>

        <div className="mt-6 grid gap-2">
          {buttons.length ? (
            buttons.map((button) => (
              <div key={button.id} className="flex min-h-14 items-center gap-3 rounded-lg border border-line bg-white px-3 py-2 text-left shadow-sm">
                <MultiLinkButtonMark type={button.type} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-ink">{button.label}</span>
                  <span className="block truncate text-xs font-semibold text-muted">{formatPreviewUrl(button.url) || "Link to be added"}</span>
                </span>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-line bg-soft p-4 text-center text-sm leading-6 text-muted">
              Links can be added after checkout.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MultiLinkButtonMark({ type }: { type: HostedPageEditorButtonType }) {
  const mark = getHostedButtonMark(type);
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xs font-medium"
      style={{ backgroundColor: mark.background, borderColor: mark.border, color: mark.color }}
      aria-label={mark.brand}
    >
      {mark.text}
    </span>
  );
}
