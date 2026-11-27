"use client";

import { SlidersHorizontal } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * The shop's Filters button, next to Sort. It opens the filter panel below the search bar and
 * closes on Escape, on a click outside, or when a filter is chosen (the page re-renders it).
 */
export function ShopFilterMenu({ activeCount, children }: { activeCount: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); buttonRef.current?.focus(); } };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return <div ref={menuRef} className="min-w-0">
    <button ref={buttonRef} type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}
      className={`flex h-11 w-full items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${activeCount || open ? "border-[#090e36] bg-[#090e36] text-white" : "border-line bg-white text-ink hover:border-[#090e36]"}`}>
      <SlidersHorizontal size={16} aria-hidden="true" />
      Filters
      {activeCount ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-xs text-[#090e36]" aria-label={`${activeCount} active`}>{activeCount}</span> : null}
    </button>
    <div id={panelId} hidden={!open} className="absolute inset-x-0 top-full z-30 mt-2 max-h-[70dvh] overflow-y-auto rounded-2xl shadow-xl">
      {children}
    </div>
  </div>;
}
