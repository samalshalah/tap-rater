"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Menu,
  X,
  BarChart3,
  Bot,
  Plug,
  Activity,
  Boxes,
  ClipboardList,
  FileText,
  GalleryHorizontalEnd,
  Hammer,
  LayoutDashboard,
  Megaphone,
  Package,
  Percent,
  Search,
  Settings,
  ShoppingBag,
  Tags,
  Truck,
  Users,
  WalletCards
} from "lucide-react";
import { adminNavigationGroups } from "@/lib/admin-navigation";

const icons = {
  Dashboard: LayoutDashboard,
  Requests: ClipboardList,
  Orders: ShoppingBag,
  "Production Queue": Hammer,
  "Customers & Licences": Users,
  Usage: Activity,
  "Workers & Health": Activity,
  "Client Failures": Activity,
  "AI Agent": Bot,
  "Google Connection": Plug,
  Products: Package,
  Categories: Tags,
  "Business Uses": Tags,
  "Stand Types": Tags,
  Inventory: Boxes,
  Discounts: Percent,
  Shipping: Truck,
  Taxes: WalletCards,
  Website: FileText,
  Media: GalleryHorizontalEnd,
  SEO: Search,
  "Store Analytics": BarChart3,
  Settings
};

export function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const menu = useRef<HTMLDialogElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => { menu.current?.close(); setMenuOpen(false); };
  useEffect(() => { menu.current?.close(); }, [pathname, searchParams]);
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onResize = () => { if (desktop.matches) closeMenu(); };
    desktop.addEventListener("change", onResize);
    return () => { document.body.style.overflow = previous; desktop.removeEventListener("change", onResize); };
  }, [menuOpen]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const navigation = (mobile: boolean) => (
      <nav aria-label={mobile ? "Admin menu" : "Admin navigation"} className={mobile ? "tr-admin-mobile-menu-links" : "tr-admin-desktop-nav lg:space-y-3"}>
        {adminNavigationGroups.map((group) => (
          <div key={group.label} className={mobile ? "tr-admin-menu-group" : "contents lg:block"}>
            <p className="tr-admin-menu-group-label mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">{group.label}</p>
            <div className="grid gap-1">
              {group.items.map((item) => {
                const Icon = icons[item.label as keyof typeof icons] ?? Megaphone;
                const itemPathname = item.href.split("?")[0];
                const itemSearch = item.href.includes("?") ? new URLSearchParams(item.href.split("?")[1]) : null;
                const active = isAdminNavigationItemActive({
                  itemHref: item.href,
                  itemPathname,
                  itemSearch,
                  pathname,
                  currentFilter: searchParams.get("filter")
                });

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={mobile ? closeMenu : undefined}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "flex shrink-0 items-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white lg:gap-3"
                        : "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-soft hover:text-ink lg:gap-3"
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
  );

  return (
    <aside className="tr-admin-sidebar border-b border-line bg-white text-ink lg:sticky lg:top-0 lg:h-screen lg:w-[224px] lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="tr-admin-brand px-4 py-4">
        <Link href="/admin" className="block">
          <Image src="/uploads-optimized/brand/tap-rater-logo-w160.webp" alt="Tap Rater admin" width={86} height={58} priority/>
        </Link>
        <span className="tr-admin-mobile-label">Admin</span>
        <button type="button" className="tr-admin-menu-toggle" aria-label="Open admin menu" aria-haspopup="dialog" aria-expanded={menuOpen} onClick={() => { menu.current?.showModal(); setMenuOpen(true); }}><Menu size={20} aria-hidden="true"/><span>Menu</span></button>
      </div>
      <dialog ref={menu} className="tr-admin-mobile-menu" aria-labelledby="admin-menu-title" onClose={() => setMenuOpen(false)} onClick={event => { if (event.target === event.currentTarget) closeMenu(); }}>
        <div className="tr-admin-menu-surface">
          <header><h2 id="admin-menu-title">Admin menu</h2><button type="button" aria-label="Close admin menu" onClick={closeMenu}><X size={22} aria-hidden="true"/></button></header>
          {navigation(true)}
          <footer><Link href="/" onClick={closeMenu}>View website</Link><button type="button" className="tr-button-outline" onClick={logout}>Log out</button></footer>
        </div>
      </dialog>
      {navigation(false)}
      <div className="hidden px-4 py-3 lg:block">
        <button className="tr-button-outline w-full min-h-10 px-3 py-2" onClick={logout}>
          Log out
        </button>
      </div>
    </aside>
  );
}

function isAdminNavigationItemActive({
  itemHref,
  itemPathname,
  itemSearch,
  pathname,
  currentFilter
}: {
  itemHref: string;
  itemPathname: string;
  itemSearch: URLSearchParams | null;
  pathname: string;
  currentFilter: string | null;
}) {
  if (itemSearch) {
    return pathname === itemPathname && Array.from(itemSearch.entries()).every(([key, value]) => key === "filter" && currentFilter === value);
  }

  if (itemHref === "/admin/orders") {
    return (pathname === "/admin/orders" && !currentFilter) || pathname.startsWith("/admin/orders/");
  }

  if (itemHref === "/admin/local") return pathname === "/admin/local";

  return pathname === itemPathname || (itemPathname !== "/admin" && pathname.startsWith(`${itemPathname}/`));
}
