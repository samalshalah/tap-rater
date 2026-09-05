"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronDown, CircleUserRound, LayoutDashboard, LogOut, Menu, PackageCheck, PanelsTopLeft, ShoppingBag, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { optimizedUploadSrc } from "@/lib/optimized-upload";

type HeaderNavigationContent = {
  items: Array<{
    label: string;
    href: string;
    order: number;
    enabled: boolean;
  }>;
};

type CustomerSessionState = {
  authenticated: boolean;
  email?: string;
  name?: string;
  businessName?: string;
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
        : (item.label.toLowerCase() === "multi-link stands" || item.label.toLowerCase() === "website links" || item.label.toLowerCase() === "website & link stands") && item.href === "/category/website-link-stands"
          ? { ...item, label: "Multi-Link Stand" }
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
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [customerSession, setCustomerSession] = useState<CustomerSessionState>({ authenticated: false });
  const [navigation, setNavigation] = useState<HeaderNavigationContent>(
    defaultHeaderNavigation,
  );
  const navItems = useMemo(
    () => orderedEnabledLinks(navigation.items),
    [navigation.items],
  );
  const accountLabel = customerSession.authenticated
    ? `Welcome, ${getCustomerFirstName(customerSession)}`
    : "Account";

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

  useEffect(() => {
    let active = true;
    fetch("/api/account/session", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (active && body) {
          setCustomerSession({
            authenticated: body.authenticated === true,
            email: typeof body.email === "string" ? body.email : undefined,
            name: typeof body.name === "string" ? body.name : undefined,
            businessName: typeof body.businessName === "string" ? body.businessName : undefined,
          });
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
            prefetch={false}
            className="inline-flex items-center"
            onClick={() => setIsMenuOpen(false)}
          >
            <Image
              src={optimizedUploadSrc("/uploads/brand/tap-rater-logo.png", 160)}
              alt="Tap Rater"
              width={126}
              height={76}
              priority
              unoptimized
              className="h-12 w-auto object-contain"
            />
          </Link>
          <nav className="hidden justify-center gap-1 rounded-[var(--tr-radius-control)] border border-line bg-white p-1.5 text-sm font-semibold text-ink shadow-sm lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="min-h-11 rounded-[var(--tr-radius-control)] px-3.5 py-2.5 transition hover:bg-soft hover:text-brand"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-end gap-3 text-sm font-medium text-ink">
            <div className="relative hidden sm:block">
              {customerSession.authenticated ? (
                <>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--tr-radius-control)] border border-line bg-white px-3.5 text-sm font-semibold transition hover:border-brand hover:text-brand"
                    aria-label="Open account menu"
                    aria-expanded={isAccountOpen}
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsAccountOpen((current) => !current);
                    }}
                  >
                    <CircleUserRound size={20} />
                    <span className="hidden max-w-36 truncate xl:inline">{accountLabel}</span>
                    <ChevronDown size={16} />
                  </button>
                  {isAccountOpen ? (
                    <AccountDropdown customer={customerSession} onClose={() => setIsAccountOpen(false)} />
                  ) : null}
                </>
              ) : (
                <Link
                  href="/account/login"
                  prefetch={false}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--tr-radius-control)] border border-line bg-white px-3.5 text-sm font-semibold transition hover:border-brand hover:text-brand"
                  aria-label="Account"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsAccountOpen(false);
                  }}
                >
                  <CircleUserRound size={20} />
                  <span className="hidden xl:inline">{accountLabel}</span>
                </Link>
              )}
            </div>
            <Link
              href="/cart"
              prefetch={false}
              aria-label={`Cart, ${cart.count} ${cart.count === 1 ? "item" : "items"}`}
              className="relative grid h-11 w-11 place-items-center rounded-[var(--tr-radius-control)] border border-line bg-white transition hover:border-brand hover:text-brand"
              onClick={() => {
                setIsMenuOpen(false);
                setIsAccountOpen(false);
              }}
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
              onClick={() => {
                setIsAccountOpen(false);
                setIsMenuOpen((current) => !current);
              }}
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
                  prefetch={false}
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
                href={customerSession.authenticated ? "/account" : "/account/login"}
                prefetch={false}
                className="min-h-12 rounded-[var(--tr-radius-control)] border border-line bg-white px-3 py-3 text-center text-sm font-semibold transition hover:border-brand hover:text-brand"
                onClick={() => setIsMenuOpen(false)}
              >
                {customerSession.authenticated ? accountLabel : "Account"}
              </Link>
              <Link
                href="/cart"
                prefetch={false}
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

const accountLinks = [
  { href: "/account", label: "Account dashboard", icon: LayoutDashboard },
  { href: "/account/stands", label: "My stands", icon: PanelsTopLeft },
  { href: "/account/orders", label: "Orders & billing", icon: PackageCheck },
];

function AccountDropdown({ customer, onClose }: { customer: CustomerSessionState; onClose: () => void }) {
  const firstName = getCustomerFirstName(customer);

  return (
    <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-72 rounded-[var(--tr-radius-card)] border border-line bg-white p-2 text-sm shadow-xl">
      <div className="border-b border-line px-3 py-3">
        <p className="font-medium text-ink">Welcome, {firstName}</p>
      </div>
      <div className="py-2">
        {accountLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              className="flex min-h-10 items-center gap-3 rounded-[var(--tr-radius-control)] px-3 py-2 font-semibold text-ink transition hover:bg-soft hover:text-brand"
              onClick={onClose}
            >
              <Icon size={17} />
              {link.label}
            </Link>
          );
        })}
      </div>
      <form action="/api/account/logout" method="post" className="border-t border-line pt-2">
        <button className="flex min-h-10 w-full items-center gap-3 rounded-[var(--tr-radius-control)] px-3 py-2 text-left font-semibold text-ink transition hover:bg-soft hover:text-brand">
          <LogOut size={17} />
          Sign out
        </button>
      </form>
    </div>
  );
}

function getCustomerFirstName(customer: CustomerSessionState) {
  const source = customer.name ?? customer.businessName ?? customer.email ?? "Customer";
  const firstToken = source.trim().split(/\s+/)[0]?.replace(/[,;]/g, "");
  return firstToken || "Customer";
}
