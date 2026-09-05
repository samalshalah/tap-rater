"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, CircleUserRound, LayoutDashboard, LogOut, Menu, PackageCheck, PanelsTopLeft, ShoppingBag, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
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
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
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
    setIsMenuOpen(false);
    setIsAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1280px)");
    function closeMobileMenu() {
      if (desktop.matches) setIsMenuOpen(false);
    }
    desktop.addEventListener("change", closeMobileMenu);
    return () => desktop.removeEventListener("change", closeMobileMenu);
  }, []);

  useEffect(() => {
    if (!isMenuOpen && !isAccountOpen) return;

    function closeOutside(event: Event) {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
        setIsAccountOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setIsMenuOpen(false);
      setIsAccountOpen(false);
      (isMenuOpen ? menuButtonRef : accountButtonRef).current?.focus();
    }

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMenuOpen, isAccountOpen]);

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
    <header ref={headerRef} className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="tr-container-wide">
        <div className="grid min-h-[72px] grid-cols-[1fr_auto] items-center gap-3 xl:min-h-[78px] xl:grid-cols-[210px_1fr_210px]">
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
          <nav className="hidden justify-center gap-1 rounded-[var(--tr-radius-control)] border border-line bg-white p-1.5 text-sm font-semibold text-ink shadow-sm xl:flex">
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
                    ref={accountButtonRef}
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
              ref={menuButtonRef}
              type="button"
              className="tr-icon-button xl:hidden"
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
          <MobileNavigation
            items={navItems}
            pathname={pathname}
            accountHref={customerSession.authenticated ? "/account" : "/account/login"}
            accountLabel={customerSession.authenticated ? accountLabel : "Account"}
            cartCount={cart.count}
            onNavigate={() => setIsMenuOpen(false)}
          />
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
