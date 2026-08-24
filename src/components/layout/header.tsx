"use client";

import Link from "next/link";
import Image from "next/image";
import { CircleUserRound, Menu, ShoppingBag, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";

type HeaderNavigationContent = {
  items: Array<{ label: string; href: string; order: number; enabled: boolean }>;
};

const defaultHeaderNavigation: HeaderNavigationContent = {
  items: [
    { label: "Home", href: "/", order: 5, enabled: true },
    { label: "Shop", href: "/shop", order: 10, enabled: true },
    { label: "Shop by Type", href: "/shop#stand-categories", order: 15, enabled: true },
    { label: "By Use", href: "/solutions", order: 20, enabled: true },
    { label: "How It Works", href: "/how-it-works", order: 30, enabled: true },
    { label: "Multi-Link", href: "/category/website-link-stands", order: 40, enabled: true },
    { label: "Resources", href: "/support", order: 60, enabled: true }
  ]
};

function orderedEnabledLinks(items: HeaderNavigationContent["items"]) {
  const enabledItems = items.filter((item) => item.enabled && item.label.toLowerCase() !== "custom branding");
  const hasShopByType = enabledItems.some((item) => item.label.toLowerCase() === "shop by type");
  const withShopByType = hasShopByType
    ? enabledItems
    : [...enabledItems, { label: "Shop by Type", href: "/shop#stand-categories", order: 15, enabled: true }];
  const hasHome = withShopByType.some((item) => item.label.toLowerCase() === "home");
  const normalizedItems = hasHome ? withShopByType : [{ label: "Home", href: "/", order: 5, enabled: true }, ...withShopByType];

  return normalizedItems.sort((first, second) => first.order - second.order || first.label.localeCompare(second.label));
}

export function Header() {
  const cart = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [navigation, setNavigation] = useState<HeaderNavigationContent>(defaultHeaderNavigation);
  const navItems = useMemo(() => orderedEnabledLinks(navigation.items), [navigation.items]);

  useEffect(() => {
    let active = true;
    fetch("/api/site/website-content")
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (active && body?.header?.items) {
          setNavigation(body.header);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="tr-container-wide">
        <div className="grid min-h-[72px] grid-cols-[1fr_auto] items-center gap-3 lg:min-h-20 lg:grid-cols-[210px_1fr_210px]">
          <Link href="/" className="inline-flex items-center" onClick={() => setIsMenuOpen(false)}>
            <Image
              src="/uploads/brand/tap-rater-logo.png"
              alt="Tap Rater"
              width={126}
              height={76}
              priority
              className="h-12 w-auto object-contain"
            />
          </Link>
          <nav className="hidden justify-center gap-1.5 rounded-xl border border-line bg-white/80 p-1.5 text-sm font-semibold text-ink shadow-sm lg:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-lg px-3.5 py-2.5 transition hover:bg-white hover:text-brand">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-end gap-3 text-sm font-medium text-ink">
            <Link
              href="/account/login"
              className="hidden min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-3.5 text-sm font-semibold transition hover:border-brand hover:text-brand sm:inline-flex"
              aria-label="Account"
              onClick={() => setIsMenuOpen(false)}
            >
              <CircleUserRound size={20} />
              <span className="hidden xl:inline">Account</span>
            </Link>
            <Link
              href="/cart"
              aria-label="Cart"
              className="relative grid h-11 w-11 place-items-center rounded-xl border border-line bg-white transition hover:border-brand hover:text-brand"
              onClick={() => setIsMenuOpen(false)}
            >
              <ShoppingBag size={22} />
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-xs font-semibold text-white">
                {cart.count}
              </span>
            </Link>
            <button
              type="button"
              className="tr-icon-button lg:hidden"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((current) => !current)}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {isMenuOpen ? (
          <nav className="grid gap-1 border-t border-line py-3 text-sm font-semibold text-ink lg:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-3 hover:bg-soft hover:text-brand"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/cart"
              className="rounded-lg px-3 py-3 hover:bg-soft hover:text-brand"
              onClick={() => setIsMenuOpen(false)}
            >
              Cart
            </Link>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
