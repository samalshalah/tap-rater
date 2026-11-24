"use client";
import { getHostedButtonMark, hostedPageButtonLimit, supportedHostedPageButtons, type HostedPageEditorButtonType } from "@/lib/hosted-page-editor-shared";
import { ArrowDown, ArrowUp, CalendarDays, ChevronDown, Globe, LinkIcon, Mail, Menu, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { GoogleReviewLinkFinder } from "@/components/account/google-review-link-finder";
import type { MultiLinkDraftButton } from "./product-setup-chooser-types";
import { createMultiLinkButtonId, formatPreviewUrl, getHostedButtonLabel } from "./product-setup-model";

const rowIconButton = "grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line bg-white text-ink hover:border-brand hover:text-brand disabled:cursor-default disabled:opacity-35 disabled:hover:border-line disabled:hover:text-ink";

// Every link shows its standard name (Google Review, Website…); only a plain custom link is named by hand.
function hasStandardName(type: HostedPageEditorButtonType) {
  return type !== "custom_link";
}

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
  const [finderFor, setFinderFor] = useState<string | null>(null);

  // Close the floating logo list on a click outside it.
  useEffect(() => {
    if (!logoPickerFor) return;
    const close = (event: PointerEvent) => {
      if (!(event.target instanceof Element && event.target.closest("[data-logo-picker]"))) setLogoPickerFor(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [logoPickerFor]);
  const previewButtons = buttons
    .map((button, index) => ({
      ...button,
      label: hasStandardName(button.type) ? getHostedButtonLabel(button.type) : button.label.trim() || getHostedButtonLabel(button.type),
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

  function moveButton(index: number, step: -1 | 1) {
    const target = index + step;
    if (target < 0 || target >= buttons.length) return;
    const next = [...buttons];
    [next[index], next[target]] = [next[target], next[index]];
    onButtonsChange(next.map((button, position) => ({ ...button, position })));
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
            Add 1 to {hostedPageButtonLimit} links now to preview the customer page, or skip and finish them from your account after payment.
          </p>
        </div>

        <div className="grid gap-1.5">
          <div className="hidden grid-cols-[180px_minmax(0,1fr)_auto] gap-2 px-2 text-xs font-semibold text-muted sm:grid" aria-hidden="true">
            <span>Link</span>
            <span>Web address</span>
            <span className="w-[116px]" />
          </div>
          {buttons.map((button, index) => (
            <div key={button.id} className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-line bg-white p-2 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
              <button
                type="button"
                className="col-span-2 flex min-h-10 w-full min-w-0 items-center gap-2 rounded-md border border-line bg-white px-1.5 text-left hover:border-ink sm:col-span-1"
                aria-label={`Choose logo for link ${index + 1}: ${getHostedButtonLabel(button.type)}`}
                aria-expanded={logoPickerFor === button.id}
                data-logo-picker
                onClick={() => setLogoPickerFor((current) => (current === button.id ? null : button.id))}
              >
                <MultiLinkButtonMark type={button.type} small />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{getHostedButtonLabel(button.type)}</span>
                <ChevronDown size={15} className="shrink-0" aria-hidden="true" />
              </button>

              <div className="flex min-w-0 items-center gap-1.5">
                <input
                  className="tr-input py-2"
                  type="url"
                  aria-label={`Web address for ${getHostedButtonLabel(button.type)}`}
                  value={button.url}
                  onChange={(event) => updateButton(button.id, { url: event.target.value })}
                  placeholder={button.type === "google_review" ? "Find on Google or paste the review link" : "https://example.com"}
                />
                {button.type === "google_review" ? (
                  <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line bg-white text-brand hover:border-brand" aria-label="Find on Google" title="Find on Google" aria-expanded={finderFor === button.id} onClick={() => setFinderFor((current) => (current === button.id ? null : button.id))}>
                    <Search size={15} aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              <div className="flex items-center gap-1">
                <button type="button" className={rowIconButton} onClick={() => moveButton(index, -1)} disabled={index === 0} aria-label={`Move ${getHostedButtonLabel(button.type)} up`} title="Move up">
                  <ArrowUp size={15} aria-hidden="true" />
                </button>
                <button type="button" className={rowIconButton} onClick={() => moveButton(index, 1)} disabled={index === buttons.length - 1} aria-label={`Move ${getHostedButtonLabel(button.type)} down`} title="Move down">
                  <ArrowDown size={15} aria-hidden="true" />
                </button>
                <button type="button" className={rowIconButton} onClick={() => removeButton(button.id)} aria-label={`Remove ${getHostedButtonLabel(button.type)}`} title="Remove">
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>

              {hasStandardName(button.type) ? null : (
                <input
                  className="tr-input col-span-2 py-2 sm:col-span-1 sm:col-start-2"
                  aria-label="Link name"
                  value={button.label}
                  onChange={(event) => updateButton(button.id, { label: event.target.value })}
                  placeholder="Link name, e.g. Book a test drive"
                />
              )}

              {finderFor === button.id ? (
                <div className="col-span-2 grid sm:col-span-3">
                  <GoogleReviewLinkFinder initialQuery={businessName} onPick={(url) => updateButton(button.id, { url })} onClose={() => setFinderFor(null)} />
                </div>
              ) : null}

              {logoPickerFor === button.id ? (
                // Floats over the rows below, so opening it never resizes the window or moves the preview.
                <div role="listbox" aria-label="Choose a logo" data-logo-picker className="absolute inset-x-2 top-[calc(100%-0.25rem)] z-30 grid max-h-72 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-line bg-white p-1.5 shadow-xl sm:grid-cols-3 lg:grid-cols-4">
                  {supportedHostedPageButtons.map((option) => (
                    <button
                      key={option.type}
                      type="button"
                      role="option"
                      aria-selected={option.type === button.type}
                      className={`flex min-h-9 items-center gap-2 rounded-md border px-1.5 text-left text-xs font-medium ${option.type === button.type ? "border-ink bg-soft ring-1 ring-ink" : "border-transparent hover:border-line hover:bg-soft"}`}
                      onClick={() => {
                        const type = option.type as HostedPageEditorButtonType;
                        const previousDefaultLabel = getHostedButtonLabel(button.type);
                        const keepCustomName = !hasStandardName(type) && button.label.trim() && button.label.trim() !== previousDefaultLabel;
                        updateButton(button.id, { type, label: keepCustomName ? button.label : getHostedButtonLabel(type) });
                        setLogoPickerFor(null);
                      }}
                    >
                      <MultiLinkButtonMark type={option.type} small />
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

export function MultiLinkButtonMark({ type, small = false }: { type: HostedPageEditorButtonType; small?: boolean }) {
  const mark = getHostedButtonMark(type);
  const size = small ? "h-7 w-7 rounded-md" : "h-9 w-9 rounded-lg";
  if (mark.logo) {
    return (
      <span className={`grid ${size} shrink-0 place-items-center overflow-hidden bg-white`} aria-label={mark.brand}>
        <img src={mark.logo} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <span
      className={`grid ${size} shrink-0 place-items-center border text-xs font-medium`}
      style={{ backgroundColor: mark.background, borderColor: mark.border, color: mark.color }}
      aria-label={mark.brand}
    >
      {mark.icon === "website" ? <Globe size={16} /> : mark.icon === "calendar" ? <CalendarDays size={16} /> : mark.icon === "menu" ? <Menu size={16} /> : mark.icon === "contact" ? <Mail size={16} /> : mark.icon === "link" ? <LinkIcon size={16} /> : mark.text}
    </span>
  );
}
