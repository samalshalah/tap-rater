"use client";
import { getHostedButtonMark, hostedPageButtonLimit, supportedHostedPageButtons, type HostedPageEditorButtonType } from "@/lib/hosted-page-editor-shared";
import { CalendarDays, ChevronDown, Globe, LinkIcon, Mail, Menu, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { MultiLinkDraftButton } from "./product-setup-chooser-types";
import { createMultiLinkButtonId, formatPreviewUrl, getHostedButtonLabel } from "./product-setup-model";
export function MultiLinkSetupStep({
  businessName,
  buttons,
  onButtonsChange
}: {
  businessName: string;
  buttons: MultiLinkDraftButton[];
  onButtonsChange: (buttons: MultiLinkDraftButton[]) => void;
}) {
  const [logoPickerFor, setLogoPickerFor] = useState<string | null>(null);
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
              <div className="grid gap-2 text-sm font-semibold text-ink">
                Logo
                <button
                  type="button"
                  className="flex min-h-11 items-center gap-2 rounded-md border border-line bg-white px-2 text-left hover:border-ink"
                  aria-label={`Choose logo for link ${index + 1}`}
                  aria-expanded={logoPickerFor === button.id}
                  onClick={() => setLogoPickerFor((current) => (current === button.id ? null : button.id))}
                >
                  <MultiLinkButtonMark type={button.type} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{getHostedButtonLabel(button.type)}</span>
                  <ChevronDown size={16} aria-hidden="true" />
                </button>
              </div>

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
              {logoPickerFor === button.id ? (
                <div role="listbox" aria-label="Choose a logo" className="grid grid-cols-2 gap-1.5 rounded-lg border border-line bg-soft p-2 sm:col-span-4 sm:grid-cols-3 lg:grid-cols-4">
                  {supportedHostedPageButtons.map((option) => (
                    <button
                      key={option.type}
                      type="button"
                      role="option"
                      aria-selected={option.type === button.type}
                      className={`flex min-h-11 items-center gap-2 rounded-md border px-2 text-left text-xs font-medium ${option.type === button.type ? "border-ink bg-white ring-2 ring-ink" : "border-line bg-white hover:border-ink"}`}
                      onClick={() => {
                        const type = option.type as HostedPageEditorButtonType;
                        const previousDefaultLabel = getHostedButtonLabel(button.type);
                        updateButton(button.id, { type, label: !button.label.trim() || button.label.trim() === previousDefaultLabel ? getHostedButtonLabel(type) : button.label });
                        setLogoPickerFor(null);
                      }}
                    >
                      <MultiLinkButtonMark type={option.type} />
                      <span className="truncate">{option.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
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
  if (mark.logo) {
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-white" aria-label={mark.brand}>
        <img src={mark.logo} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-xs font-medium"
      style={{ backgroundColor: mark.background, borderColor: mark.border, color: mark.color }}
      aria-label={mark.brand}
    >
      {mark.icon === "website" ? <Globe size={16} /> : mark.icon === "calendar" ? <CalendarDays size={16} /> : mark.icon === "menu" ? <Menu size={16} /> : mark.icon === "contact" ? <Mail size={16} /> : mark.icon === "link" ? <LinkIcon size={16} /> : mark.text}
    </span>
  );
}
