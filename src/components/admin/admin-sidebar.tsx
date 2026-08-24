"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
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
  Customers: Users,
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
  Analytics: BarChart3,
  Settings
};

export function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="border-b border-line bg-white text-ink lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="px-4 py-5">
        <Link href="/admin" className="block">
          <p className="tr-eyebrow">Tap Rater</p>
          <h2 className="mt-1 text-lg font-black">Commerce Admin</h2>
        </Link>
      </div>
      <nav className="flex gap-3 overflow-x-auto px-4 pb-4 lg:block lg:space-y-6 lg:overflow-visible">
        {adminNavigationGroups.map((group) => (
          <div key={group.label} className="min-w-64 lg:min-w-0">
            <p className="mb-2 px-2 text-xs font-black uppercase tracking-[0.06em] text-muted">{group.label}</p>
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
                    className={
                      active
                        ? "flex items-center gap-3 rounded-lg bg-ink px-3 py-2 text-sm font-bold text-white"
                        : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-muted hover:bg-soft hover:text-ink"
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
      <div className="hidden px-4 py-5 lg:block">
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

  return pathname === itemPathname || (itemPathname !== "/admin" && pathname.startsWith(`${itemPathname}/`));
}
