import Link from "next/link";
import { ChevronDown, ChevronRight, CircleUserRound, LogOut, ShoppingBag } from "lucide-react";
import { isNavigationActive } from "@/lib/customer-navigation";
import { isStandTypePath, shopByTypeHref, StandTypeLinks } from "@/components/layout/stand-type-links";

type MobileNavigationProps = {
  items: Array<{ label: string; href: string }>;
  pathname: string;
  accountHref: string;
  accountLabel: string;
  cartCount: number;
  authenticated?: boolean;
  onNavigate: () => void;
};

export function MobileNavigation({ items, pathname, accountHref, accountLabel, cartCount, authenticated = false, onNavigate }: MobileNavigationProps) {
  return (
    <div id="mobile-site-navigation" className="absolute inset-x-0 top-full max-h-[calc(100dvh-73px)] overflow-y-auto overscroll-contain border-y border-line bg-white px-4 py-2 shadow-lg sm:px-5 xl:hidden">
      <div className="sticky top-0 z-10 grid grid-cols-2 gap-2 border-b border-line bg-white pb-2">
        <Link href={accountHref} prefetch={false} onClick={onNavigate} className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-soft hover:text-brand">
          <CircleUserRound size={18} className="shrink-0" aria-hidden="true" />
          <span className="min-w-0 [overflow-wrap:anywhere]">{accountLabel}</span>
        </Link>
        <Link href="/cart" prefetch={false} onClick={onNavigate} className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-soft hover:text-brand">
          <ShoppingBag size={18} className="shrink-0" aria-hidden="true" />
          <span className="min-w-0 [overflow-wrap:anywhere]">Cart ({cartCount})</span>
        </Link>
      </div>
      <nav aria-label="Mobile navigation" className="divide-y divide-line text-ink">
        {items.map((item) => item.href === shopByTypeHref ? (
          <details key={item.href} className="group">
            <summary className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-base hover:bg-soft hover:text-brand [&::-webkit-details-marker]:hidden ${isStandTypePath(pathname) ? "bg-panel text-brand" : ""}`}>
              <span>{item.label}</span>
              <ChevronDown size={16} className="shrink-0 group-open:rotate-180" aria-hidden="true" />
            </summary>
            <StandTypeLinks pathname={pathname} onNavigate={onNavigate} className="mb-2 ml-3 border-l border-line pl-2" />
          </details>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            aria-current={isNavigationActive(pathname, item.href) ? "page" : undefined}
            onClick={onNavigate}
            className={`flex min-h-11 items-center justify-between gap-3 px-3 py-2.5 text-base transition hover:bg-soft hover:text-brand ${isNavigationActive(pathname, item.href) ? "bg-panel text-brand" : ""}`}
          >
            <span className="min-w-0 [overflow-wrap:anywhere]">{item.label}</span>
            <ChevronRight size={16} className="shrink-0" aria-hidden="true" />
          </Link>
        ))}
      </nav>
      {authenticated ? (
        <div className="border-t border-line pt-2">
          <form action="/api/account/logout" method="post">
            <button className="flex min-h-11 w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-semibold text-ink hover:bg-soft hover:text-brand">
              <LogOut size={18} aria-hidden="true" />Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
