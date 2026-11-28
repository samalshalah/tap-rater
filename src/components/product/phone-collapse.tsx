"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

/**
 * Phones only: shows the first part of long content with a "show more" button.
 * The full content is always in the page (for search engines and screen readers); tablets and desktops see it all.
 */
export function PhoneCollapse({ children, label, height = 300, fadeClassName = "from-white" }: { children: ReactNode; label: string; height?: number; fadeClassName?: string }) {
  const [open, setOpen] = useState(false);
  return <div>
    <div className={open ? undefined : "relative max-h-[var(--phone-collapse-h)] overflow-hidden sm:max-h-none sm:overflow-visible"} style={{ "--phone-collapse-h": `${height}px` } as CSSProperties}>
      {children}
      {open ? null : <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t ${fadeClassName} to-transparent sm:hidden`} />}
    </div>
    {open ? null : <button type="button" onClick={() => setOpen(true)} className="mt-3 min-h-11 text-sm font-semibold text-brand underline underline-offset-4 sm:hidden">{label}</button>}
  </div>;
}
