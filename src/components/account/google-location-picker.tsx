"use client";

import type { RefObject } from "react";
import { Building2, Check, ChevronDown, Info, MapPin, Search } from "lucide-react";
import type { GoogleLocationChoice } from "@/lib/google-business/location-discovery";

type Props = {
  picker: RefObject<HTMLDialogElement | null>;
  email: string;
  businesses: { id: string; business_name: string; address?: string }[];
  locations: GoogleLocationChoice[];
  visibleLocations: GoogleLocationChoice[];
  selected: GoogleLocationChoice | undefined;
  address: (choice: GoogleLocationChoice) => string;
  filter: string;
  setFilter: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  setAccount: (value: string) => void;
  confirmed: boolean;
  setConfirmed: (value: boolean) => void;
  business: string;
  setBusiness: (value: string) => void;
  compact: boolean;
  businessId?: string;
  busy: boolean;
  error: string;
  setPickerOpen: (value: boolean) => void;
  run: (action: "connect" | "accounts" | "bind" | "disconnect") => Promise<void>;
};

export function GoogleLocationPicker({
  picker, email, businesses, locations, visibleLocations, selected, address, filter, setFilter,
  location, setLocation, setAccount, confirmed, setConfirmed, business, setBusiness, compact,
  businessId, busy, error, setPickerOpen, run
}: Props) {
  const canConnect = Boolean(location && business && confirmed);

  return (
    <dialog ref={picker} onCancel={(event) => { event.preventDefault(); setPickerOpen(false); }} aria-labelledby="google-location-picker-title" className="m-auto max-h-[88vh] w-[min(760px,94vw)] overflow-hidden rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-slate-900/40">
      <div className="border-b border-line px-5 pb-4 pt-5 sm:px-7">
        <h3 id="google-location-picker-title" className="text-lg font-semibold tracking-tight">Choose a Google location</h3>
        <p className="mt-1 text-sm text-muted">Select the business you want to connect for {email}.</p>
      </div>

      {locations.length > 0 && <div className="space-y-4 px-5 py-4 sm:px-7">
        <div className="flex items-center justify-between gap-3">
          <label className="relative min-w-0 flex-1"><span className="sr-only">Search businesses</span><Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-muted" /><input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search by name or address" className="w-full rounded-lg border border-line py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-600" /></label>
          <span className="shrink-0 text-xs text-muted">{visibleLocations.length} locations</span>
        </div>

        <fieldset className="m-0 min-w-0 border-0 p-0"><legend className="sr-only">Choose one Google business</legend><div className="grid max-h-[36vh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {visibleLocations.map((choice) => {
            const isSelected = location === choice.name;
            return <label key={choice.name} className={`relative flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition focus-within:ring-2 focus-within:ring-violet-600 ${isSelected ? "border-violet-300 bg-violet-50" : "border-line bg-white hover:border-violet-200"}`}>
              <input type="radio" name="google-location-choice" value={choice.name} checked={isSelected} onChange={() => { setLocation(choice.name); setAccount(choice.account); setConfirmed(false); }} className="sr-only" />
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isSelected ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}><Building2 aria-hidden="true" className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold leading-5">{choice.title || choice.name}</span><span className="mt-1 flex items-start gap-1 text-xs leading-4 text-muted"><MapPin aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />{address(choice)}</span></span>
              <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300"}`}>{isSelected && <Check className="h-3 w-3" />}</span>
            </label>;
          })}
        </div></fieldset>

        {visibleLocations.length === 0 && <p role="status" className="py-4 text-center text-sm text-muted">No businesses match your search.</p>}
        {!compact && !businessId && <label className="grid gap-1 text-sm font-medium">Tap Rater workspace<select className="rounded-lg border border-line bg-white p-2 text-sm" value={business} onChange={(event) => { setBusiness(event.target.value); setConfirmed(false); }}><option value="">Choose workspace</option>{businesses.map((item) => <option key={item.id} value={item.id}>{item.business_name}{item.address ? ` · ${item.address}` : ""}</option>)}</select></label>}
      </div>}

      {locations.length > 0 && <div className="border-t border-line bg-slate-50 px-5 py-4 sm:px-7">
        {selected ? <div className="mb-4 rounded-lg border border-violet-100 bg-white px-3 py-2.5"><p className="text-xs font-medium text-muted">Selected location</p><p className="mt-0.5 text-sm font-semibold">{selected.title || selected.name}</p><p className="mt-0.5 text-xs text-muted">{address(selected)}</p>{(selected.phoneNumbers?.primaryPhone||selected.websiteUri)&&<p className="mt-1 text-xs text-muted">{[selected.phoneNumbers?.primaryPhone,selected.websiteUri].filter(Boolean).join(' · ')}</p>}</div> : <p className="mb-4 text-sm text-muted">Select a business to continue.</p>}
        <label className="flex items-start gap-2.5 text-sm leading-5"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" /><span>I’m authorized to connect this Google Business Profile to the selected Tap Rater workspace.</span></label>
        <details className="mt-3 text-xs leading-5 text-muted"><summary className="flex cursor-pointer items-center gap-1.5 font-medium text-violet-700"><Info aria-hidden="true" className="h-3.5 w-3.5" />How review replies work<ChevronDown aria-hidden="true" className="h-3.5 w-3.5" /></summary><p className="mt-2 pl-5">Tap Rater uses review text and ratings to draft and publish replies to new and older unanswered 4–5-star reviews on Google. Replies to 1–3-star reviews stay as drafts for you to review and submit.</p></details>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap gap-1"><button type="button" className="tr-button-ghost" disabled={busy} onClick={() => run("connect")}>Use another account</button><button type="button" className="tr-button-ghost" disabled={busy} onClick={() => { setPickerOpen(false); setConfirmed(false); }}>Back</button></div><button className="tr-button-primary" disabled={!canConnect || busy} onClick={() => run("bind")}>Connect location</button></div>
      </div>}

      {busy && <p role="status" className="px-5 pb-4 text-sm text-muted sm:px-7">Loading businesses…</p>}
      {error && <p role="alert" className="px-5 pb-4 text-sm text-red-700 sm:px-7">{error}</p>}
    </dialog>
  );
}
