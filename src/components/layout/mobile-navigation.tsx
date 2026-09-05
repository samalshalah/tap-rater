import Link from "next/link";
import { ChevronRight, CircleUserRound, ShoppingBag } from "lucide-react";

type MobileNavigationProps = {
  items: Array<{ label: string; href: string }>;
  pathname: string;
  accountHref: string;
  accountLabel: string;
  cartCount: number;
  onNavigate: () => void;
};

export function MobileNavigation({ items, pathname, accountHref, accountLabel, cartCount, onNavigate }: MobileNavigationProps) {
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
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            aria-current={pathname === item.href ? "page" : undefined}
            onClick={onNavigate}
            className={`flex min-h-11 items-center justify-between gap-3 px-3 py-2.5 text-base transition hover:bg-soft hover:text-brand ${pathname === item.href ? "bg-panel text-brand" : ""}`}
          >
            <span className="min-w-0 [overflow-wrap:anywhere]">{item.label}</span>
            <ChevronRight size={16} className="shrink-0" aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
