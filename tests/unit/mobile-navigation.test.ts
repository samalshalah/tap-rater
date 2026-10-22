import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { customerNavigation } from "@/lib/customer-navigation";

const props = {
  items: [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: "Shop by Type", href: "/shop#stand-types" },
    { label: "Resources", href: "/support" }
  ],
  pathname: "/shop",
  accountHref: "/account/login",
  accountLabel: "Account",
  cartCount: 3,
  onNavigate: () => undefined
};

describe("mobile navigation", () => {
  it("shows customer destinations and sign out instead of the storefront menu", () => {
    const html = renderToStaticMarkup(createElement(MobileNavigation, {
      ...props,
      authenticated: true,
      accountHref: "/account",
      accountLabel: "Welcome, Alex",
      pathname: "/account/orders/example",
      items: customerNavigation,
    }));
    for (const item of customerNavigation) expect(html).toContain(`href="${item.href}"`);
    expect(html).toContain('aria-label="Customer mobile navigation"');
    expect(html).toContain('action="/api/account/logout"');
    expect(html).toContain('method="post"');
    expect(html).toContain('Shop stands');
    expect(html).not.toContain('Shop by Type');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="page"[^>]*href="\/account\/orders"/);
  });
  it("puts account and cart before the navigation and retains all configured destinations", () => {
    const html = renderToStaticMarkup(createElement(MobileNavigation, props));
    expect(html.indexOf('href="/account/login"')).toBeLessThan(html.indexOf('<nav'));
    expect(html.indexOf('href="/cart"')).toBeLessThan(html.indexOf('<nav'));
    expect(html).toContain('Cart (3)');
    for (const item of props.items) expect(html).toContain(`href="${item.href}"`);
    expect(html).toContain('aria-label="Mobile navigation"');
    expect(html).toContain('id="mobile-site-navigation"');
  });

  it("marks only the current route, not its hash-link sibling", () => {
    const html = renderToStaticMarkup(createElement(MobileNavigation, props));
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="page"[^>]*href="\/shop"/);
  });

  it("preserves authenticated account access and handles long labels without truncation", () => {
    const html = renderToStaticMarkup(createElement(MobileNavigation, {
      ...props,
      accountHref: "/account",
      accountLabel: "Welcome, Alexandria",
      items: [{ label: "A much longer configured navigation label", href: "/custom-stands" }]
    }));
    expect(html).toContain('href="/account"');
    expect(html).toContain('Welcome, Alexandria');
    expect(html).toContain('A much longer configured navigation label');
    expect(html).toContain('overflow-wrap:anywhere');
    expect(html).not.toContain('truncate');
    expect(html).toContain('max-h-[calc(100dvh-73px)]');
    expect(html).toContain('overflow-y-auto');
  });
});
