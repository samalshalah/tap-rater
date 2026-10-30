"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { catalogCategories } from "@/data/migrated-products";
import { getCategoryHref } from "@/lib/category-routes";

export function PrismaticShopMenu({ links }: { links: { href: string; label: string }[] }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  useEffect(() => { if (ref.current) ref.current.open = false; }, [pathname]);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) ref.current.open = false; };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return <details ref={ref} className="tr-shop-menu" onKeyDown={event => {
    if (event.key === "Escape" && ref.current) { ref.current.open = false; ref.current.querySelector("summary")?.focus(); }
  }}>
    <summary aria-label="Browse shop collections"><ChevronDown size={14} /></summary>
    <div className="tr-shop-menu-panel" onClick={event => { if ((event.target as HTMLElement).closest("a") && ref.current) ref.current.open = false; }}>
      <div><h2>Shop by Type</h2>{catalogCategories.map(category => <Link key={category.slug} href={getCategoryHref(category.slug)}>{category.title}</Link>)}</div>
      <div><h2>Explore</h2>{links.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}</div>
      <Link className="tr-shop-menu-feature" href="/product/google-review-stand"><img src="/assets/custom-google.webp" alt="Custom Google Review stand" /><span>Custom Google Review Stand →</span></Link>
    </div>
  </details>;
}
