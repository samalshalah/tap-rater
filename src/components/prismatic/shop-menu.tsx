"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { isStandTypePath, StandTypeLinks } from "@/components/layout/stand-type-links";

export function PrismaticShopMenu({ label, pathname }: { label: string; pathname: string }) {
  const ref = useRef<HTMLDetailsElement>(null);

  const closeMenu = useCallback(() => {
    if (ref.current) ref.current.open = false;
  }, []);

  useEffect(closeMenu, [closeMenu, pathname]);
  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) closeMenu();
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [closeMenu]);

  return (
    <details
      ref={ref}
      className="tr-shop-menu group"
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) closeMenu();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !event.currentTarget.open) return;
        event.preventDefault();
        closeMenu();
        event.currentTarget.querySelector("summary")?.focus();
      }}
    >
      <summary className={`flex min-h-11 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[var(--tr-radius-control)] px-2.5 hover:bg-soft hover:text-brand ${isStandTypePath(pathname) ? "bg-panel text-brand" : ""}`}>
        {label}
        <ChevronDown size={14} className="shrink-0 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="tr-shop-menu-panel">
        <StandTypeLinks pathname={pathname} onNavigate={closeMenu} className="grid content-start grid-cols-2 gap-2" />
        <Link className="tr-shop-menu-feature" href="/product/google-review-stand" prefetch={false} onClick={closeMenu}>
          <img src="/assets/custom-google.webp" alt="" />
          <span className="flex items-center gap-2">Custom Google Review Stand <ArrowRight size={15} aria-hidden="true" /></span>
        </Link>
      </div>
    </details>
  );
}
