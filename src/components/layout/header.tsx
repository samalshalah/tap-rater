"use client";

import { loadWebsiteNavigation } from "@/lib/website-content-client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Link2, ArrowLeft, ChevronDown, UserRound, ShoppingCart, LayoutDashboard, LogOut, Menu, PackageCheck, PanelsTopLeft, ShoppingBag, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { optimizedUploadSrc } from "@/lib/optimized-upload";
import { navigationForPurchases, isNavigationActive } from "@/lib/customer-navigation";
import { PrismaticShopMenu } from "@/components/prismatic/shop-menu";

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
  service?: boolean;
  stands?: boolean;
  multilink?: boolean;
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
    { label: "Shop by Business", href: "/solutions", order: 20, enabled: true },
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
      item.href === "/solutions" && ["by use", "shop by use", "business uses"].includes(item.label.toLowerCase())
        ? { ...item, label: "Shop by Business" }
        : item.label.toLowerCase() === "shop by type"
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
    () => customerSession.authenticated ? navigationForPurchases(customerSession) : orderedEnabledLinks(navigation.items),
    [customerSession.authenticated, customerSession.service, customerSession.stands, customerSession.multilink, navigation.items],
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
    loadWebsiteNavigation()
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
    function refreshSession() {
      fetch("/api/account/session", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((body) => {
          if (active) {
            setCustomerSession({
              authenticated: body?.authenticated === true,
              service: body?.service === true,
              stands: body?.stands === true,
              multilink: body?.multilink === true,
              email: typeof body?.email === "string" ? body.email : undefined,
              name: typeof body?.name === "string" ? body.name : undefined,
              businessName: typeof body?.businessName === "string" ? body.businessName : undefined,
            });
          }
        })
        .catch(() => undefined);
    }
    refreshSession();
    window.addEventListener("focus", refreshSession);

    return () => {
      active = false;
      window.removeEventListener("focus", refreshSession);
    };
  }, [pathname]);

  return (
    <header ref={headerRef} className="tr-site-header sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="tr-container-wide">
        <div className="tr-header-row grid min-h-[72px] grid-cols-[1fr_auto] items-center gap-3 xl:min-h-[78px] xl:grid-cols-[210px_1fr_210px]">
          {pathname.startsWith("/product/") ? <Link href="/shop" className="flex min-h-11 items-center gap-2 font-semibold text-ink md:hidden"><ArrowLeft size={22} aria-hidden="true" />Back to shop</Link> : null}
          <Link
            href={customerSession.authenticated ? "/account" : "/"}
            prefetch={false}
            className={pathname.startsWith("/product/") ? "hidden items-center md:inline-flex" : "inline-flex items-center"}
            onClick={() => setIsMenuOpen(false)}
          >
            <Image
              src={optimizedUploadSrc("/uploads/brand/tap-rater-logo.png", 160)}
              alt="Tap Rater"
              width={126}
              height={76}
              priority
              unoptimized
              className="tr-header-logo h-9 w-auto object-contain"
            />
          </Link>
          <nav aria-label={customerSession.authenticated ? "Customer navigation" : "Main navigation"} className="hidden justify-center gap-1 rounded-[var(--tr-radius-control)] border border-line bg-white p-1.5 text-sm font-semibold text-ink shadow-sm xl:flex">
            {navItems.map((item) => (
              <div key={item.href} className="tr-header-nav-item">
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                aria-current={isNavigationActive(pathname, item.href) ? "page" : undefined}
                className={`min-h-11 rounded-[var(--tr-radius-control)] px-3.5 py-2.5 transition hover:bg-soft hover:text-brand ${isNavigationActive(pathname, item.href) ? "bg-panel text-brand" : ""}`}
              >
                {item.label}
              </Link>
              {item.href === "/shop" && !customerSession.authenticated ? <PrismaticShopMenu links={navItems.filter(link => link.href !== "/shop")} /> : null}
              </div>
            ))}
          </nav>
          <div className="flex items-center justify-end gap-3 text-sm font-medium text-ink">
            <div className="relative hidden sm:block">
              {customerSession.authenticated ? (
                <>
                  <button
                    ref={accountButtonRef}
                    type="button"
                    className="tr-header-action inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-semibold"
                    aria-label="Open account menu"
                    aria-expanded={isAccountOpen}
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsAccountOpen((current) => !current);
                    }}
                  >
                    <UserRound size={16} strokeWidth={1.75} aria-hidden="true" />
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
                  className="tr-header-action inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-semibold"
                  aria-label="Account"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsAccountOpen(false);
                  }}
                >
                  <UserRound size={16} strokeWidth={1.75} aria-hidden="true" />
                  <span className="hidden xl:inline">{accountLabel}</span>
                </Link>
              )}
            </div>
            <Link
              href="/cart"
              prefetch={false}
              aria-label={`Cart, ${cart.count} ${cart.count === 1 ? "item" : "items"}`}
              className="tr-header-action relative grid h-11 w-11 shrink-0 place-items-center"
              onClick={() => {
                setIsMenuOpen(false);
                setIsAccountOpen(false);
              }}
            >
              <ShoppingCart size={16} strokeWidth={1.75} aria-hidden="true" />
              <span className="tr-header-cart-count absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-xs font-semibold text-white">
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
            authenticated={customerSession.authenticated}
            onNavigate={() => setIsMenuOpen(false)}
          />
        ) : null}
      </div>
    </header>
  );
}

const accountLinks = [
  { href: "/account/multilink", label: "Multi-Link", icon: Link2 },
  { href: "/account", label: "Account dashboard", icon: LayoutDashboard },
  { href: "/account/stands", label: "My stands", icon: PanelsTopLeft },
  { href: "/account/heatmap", label: "Heat Map", icon: LayoutDashboard },
  { href: "/account/orders", label: "Orders & billing", icon: PackageCheck },
  { href: "/shop", label: "Shop stands", icon: ShoppingBag },
];

function AccountDropdown({ customer, onClose }: { customer: CustomerSessionState; onClose: () => void }) {
  const firstName = getCustomerFirstName(customer);

  return (
    <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-72 rounded-[var(--tr-radius-card)] border border-line bg-white p-2 text-sm shadow-xl">
      <div className="border-b border-line px-3 py-3">
        <p className="font-medium text-ink">Welcome, {firstName}</p>
      </div>
      <div className="py-2">
        {accountLinks.filter(link=>link.href==='/shop'||navigationForPurchases(customer).some(item=>item.href===link.href)).map((link) => {
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
