"use client";

import { LoaderCircle, MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState, type InvalidEvent, type KeyboardEvent } from "react";
import { selectShippingAddress, suggestShippingAddresses } from "@/lib/shipping-address-client";
import type { AddressSuggestion, SuggestedShippingAddress } from "@/lib/shipping-address";

export function AddressAutocomplete({ value, onChange, onSelect, onBusyChange, onInvalid }: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: SuggestedShippingAddress) => void;
  onBusyChange: (busy: boolean) => void;
  onInvalid: (event: InvalidEvent<HTMLInputElement>) => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const session = useRef("");
  const request = useRef<AbortController | null>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "searching" | "selecting" | "empty" | "unavailable" | "selected">("idle");
  const expanded = open && suggestions.length > 0;

  useEffect(() => {
    if (!query || query.trim().length < 3) return;
    const controller = new AbortController();
    request.current = controller;
    const timer = window.setTimeout(async () => {
      setStatus("searching");
      session.current ||= crypto.randomUUID();
      try {
        const result = await suggestShippingAddresses(query.trim(), session.current, controller.signal);
        if (controller.signal.aborted) return;
        setSuggestions(result.suggestions);
        setStatus(result.suggestions.length ? "idle" : "empty");
      } catch {
        if (!controller.signal.aborted) setStatus("unavailable");
      }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  useEffect(() => () => request.current?.abort(), []);

  function dismiss() {
    request.current?.abort();
    setQuery("");
    setOpen(false);
    setSuggestions([]);
    setActive(-1);
    setStatus("idle");
    onBusyChange(false);
  }

  async function select(suggestion: AddressSuggestion) {
    request.current?.abort();
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    setActive(-1);
    setStatus("selecting");
    onBusyChange(true);
    const controller = new AbortController();
    request.current = controller;
    const token = session.current;
    session.current = "";
    try {
      const result = await selectShippingAddress(suggestion.placeId, token, controller.signal);
      if (controller.signal.aborted) return;
      onSelect(result.address);
      setStatus("selected");
      inputRef.current?.focus();
    } catch {
      if (!controller.signal.aborted) setStatus("unavailable");
    } finally {
      if (!controller.signal.aborted) onBusyChange(false);
    }
  }

  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      if (open) event.preventDefault();
      dismiss();
    } else if (expanded && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      const next = event.key === "ArrowDown" ? (active + 1) % suggestions.length : (active <= 0 ? suggestions.length - 1 : active - 1);
      setActive(next);
      document.getElementById(`${id}-option-${next}`)?.scrollIntoView({ block: "nearest" });
    } else if (expanded && event.key === "Enter") {
      event.preventDefault();
      if (active >= 0) void select(suggestions[active]);
    }
  }

  return (
    <div className="relative min-w-0" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) dismiss();
    }}>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-ink">Address</label>
      <div className="relative">
        <input
          ref={inputRef} id={id} type="text" value={value} required maxLength={160}
          role="combobox" aria-autocomplete="list" aria-expanded={expanded}
          aria-controls={expanded ? `${id}-suggestions` : undefined}
          aria-activedescendant={expanded && active >= 0 ? `${id}-option-${active}` : undefined}
          aria-describedby={`${id}-status`} autoComplete="shipping address-line1"
          onInvalid={onInvalid} onKeyDown={keyDown}
          onChange={(event) => {
            request.current?.abort();
            onBusyChange(false);
            onChange(event.target.value);
            setQuery(event.target.value);
            setSuggestions([]);
            setActive(-1);
            setOpen(true);
            setStatus("idle");
          }}
          className="min-h-11 w-full min-w-0 scroll-mt-32 rounded-md border border-line bg-white pl-3 pr-10 text-base font-normal text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 sm:text-sm"
        />
        {status === "searching" || status === "selecting" ? <LoaderCircle size={18} aria-hidden="true" className="pointer-events-none absolute right-3 top-3 animate-spin text-muted" /> : null}
      </div>
      {expanded ? (
        <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-line bg-white shadow-lg">
          <ul id={`${id}-suggestions`} role="listbox" aria-label="Address suggestions" className="max-h-60 overflow-y-auto overscroll-contain">
            {suggestions.map((suggestion, index) => (
              <li key={suggestion.placeId} id={`${id}-option-${index}`} role="option" aria-selected={active === index}
                onMouseDown={(event) => event.preventDefault()} onClick={() => void select(suggestion)}
                className={`flex min-h-12 cursor-pointer items-start gap-2 border-b border-line px-3 py-3 text-sm leading-5 last:border-b-0 hover:bg-soft ${active === index ? "bg-soft text-brand" : "text-ink"}`}>
                <MapPin size={16} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
                <span className="min-w-0 break-words">{suggestion.label}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-3 py-2 text-right text-xs font-normal not-italic text-[#5e5e5e]">
            <span translate="no" className="whitespace-nowrap">Google Maps</span>
          </div>
        </div>
      ) : null}
      <p id={`${id}-status`} role="status" className={status === "unavailable" || status === "empty" ? "mt-2 text-xs leading-5 text-muted" : "sr-only"}>
        {status === "unavailable" ? "Address suggestions are unavailable. Enter your address manually."
          : status === "empty" ? "No matching addresses. Enter your address manually."
          : status === "searching" ? "Searching addresses."
          : status === "selecting" ? "Filling address."
          : status === "selected" ? "Address filled. Review city, state, and ZIP code."
          : expanded ? `${suggestions.length} address suggestions available.` : ""}
      </p>
    </div>
  );
}
