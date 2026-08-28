"use client";

import Link from "next/link";
import Image from "next/image";
import { CircleUserRound, Menu, ShoppingBag, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";

type HeaderNavigationContent = {
  items: Array<{
    label: string;
    href: string;
    order: number;
    enabled: boolean;
  }>;
};

const defaultHeaderNavigation: HeaderNavigationContent = {
  items: [
    { label: "Home", href: "/", order: 5, enabled: true },
    { label: "Shop", href: "/shop", order: 10, enabled: true },
    {
      label: "Shop by Type",
      href: "/shop#stand-types",
      order: 15,
      enabled: true,
    },
    { label: "By Use", href: "/solutions", order: 20, enabled: true },
    { label: "How It Works", href: "/how-it-works", order: 30, enabled: true },
    {
      label: "Multi-Link",
      href: "/multi-link",
      order: 40,
      enabled: true,
    },
    { label: "Resources", href: "/support", order: 60, enabled: true },
  ],
};

const mobileNavigationDescriptions: Record<string, string> = {
  Home: "Start from the main Tap Rater storefront.",
  Shop: "Browse all stands with filters.",
  "Shop by Type": "Choose review, menu, link, and other stand types.",
  "By Use": "Shop by business or customer action.",
  "How It Works": "See the buying and setup flow.",
  "Multi-Link": "Add an editable hosted page to compatible stands.",
  Resources: "FAQ, support, and help pages.",
};

function orderedEnabledLinks(items: HeaderNavigationContent["items"]) {
  const enabledItems = items.filter(
    (item) => item.enabled && item.label.toLowerCase() !== "custom branding",
  );
  const hasShopByType = enabledItems.some(
    (item) => item.label.toLowerCase() === "shop by type",
  );
  const withShopByType = hasShopByType
    ? enabledItems
    : [
        ...enabledItems,
        {
          label: "Shop by Type",
          href: "/shop#stand-types",
          order: 15,
          enabled: true,
        },
      ];
  const hasHome = withShopByType.some(
    (item) => item.label.toLowerCase() === "home",
  );
  const normalizedItems = hasHome
    ? withShopByType
    : [
        { label: "Home", href: "/", order: 5, enabled: true },
        ...withShopByType,
      ];

  return normalizedItems
    .map((item) =>
      item.label.toLowerCase() === "shop by type"
        ? { ...item, href: "/shop#stand-types" }
        : (item.label.toLowerCase() === "multi-link stands" || item.label.toLowerCase() === "website links") && item.href === "/category/website-link-stands"
          ? { ...item, label: "Website & Link Stands" }
        : item,
    )
    .sort(
      (first, second) =>
        first.order - second.order || first.label.localeCompare(second.label),
    );
}

export function Header() {
  const cart = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [navigation, setNavigation] = useState<HeaderNavigationContent>(
    defaultHeaderNavigation,
  );
  const navItems = useMemo(
    () => orderedEnabledLinks(navigation.items),
    [navigation.items],
  );

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
        <div className="grid min-h-[72px] grid-cols-[1fr_auto] items-center gap-3 lg:min-h-[78px] lg:grid-cols-[210px_1fr_210px]">
          <Link
            href="/"
            className="inline-flex items-center"
            onClick={() => setIsMenuOpen(false)}
          >
            <Image
              src="/uploads/brand/tap-rater-logo.png"
              alt="Tap Rater"
              width={126}
              height={76}
              priority
              className="h-12 w-auto object-contain"
            />
          </Link>
          <nav className="hidden justify-center gap-1 rounded-[var(--tr-radius-control)] border border-line bg-white p-1.5 text-sm font-semibold text-ink shadow-sm lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="min-h-11 rounded-[var(--tr-radius-control)] px-3.5 py-2.5 transition hover:bg-soft hover:text-brand"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-end gap-3 text-sm font-medium text-ink">
            <Link
              href="/account/login"
              className="hidden min-h-11 items-center justify-center gap-2 rounded-[var(--tr-radius-control)] border border-line bg-white px-3.5 text-sm font-semibold transition hover:border-brand hover:text-brand sm:inline-flex"
              aria-label="Account"
              onClick={() => setIsMenuOpen(false)}
            >
              <CircleUserRound size={20} />
              <span className="hidden xl:inline">Account</span>
            </Link>
            <Link
              href="/cart"
              aria-label="Cart"
              className="relative grid h-11 w-11 place-items-center rounded-[var(--tr-radius-control)] border border-line bg-white transition hover:border-brand hover:text-brand"
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
              aria-controls="mobile-site-navigation"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((current) => !current)}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {isMenuOpen ? (
          <div
            id="mobile-site-navigation"
            className="border-t border-line py-3 lg:hidden"
          >
            <nav className="grid gap-2 text-ink" aria-label="Mobile navigation">
              {navItems.map((item) => (
                <Link
                key={item.href}
                href={item.href}
                  className="rounded-[var(--tr-radius-card)] border border-line bg-white px-4 py-3.5 transition hover:border-brand hover:text-brand"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="block text-base font-semibold">
                    {item.label}
                  </span>
                  <span className="mt-1 block text-sm font-normal leading-5 text-muted">
                    {mobileNavigationDescriptions[item.label] ??
                      "Open this section."}
                  </span>
                </Link>
              ))}
            </nav>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
              <Link
                href="/account/login"
                className="min-h-12 rounded-[var(--tr-radius-control)] border border-line bg-white px-3 py-3 text-center text-sm font-semibold transition hover:border-brand hover:text-brand"
                onClick={() => setIsMenuOpen(false)}
              >
                Account
              </Link>
              <Link
                href="/cart"
                className="min-h-12 rounded-[var(--tr-radius-control)] border border-ink bg-ink px-3 py-3 text-center text-sm font-semibold text-white transition hover:border-brand hover:bg-brand"
                onClick={() => setIsMenuOpen(false)}
              >
                Cart ({cart.count})
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
