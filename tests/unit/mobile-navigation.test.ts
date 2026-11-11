import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MobileNavigation } from "@/components/layout/mobile-navigation";

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

const directLinks = props.items.filter(({ href }) => href !== "/shop#stand-types");

describe("mobile navigation", () => {
  it("shows the public menu alongside account access after sign-in", () => {
    const html = renderToStaticMarkup(createElement(MobileNavigation, {
      ...props,
      authenticated: true,
      accountHref: "/account",
      accountLabel: "Welcome, Alex",
    }));
    for (const item of directLinks) expect(html).toContain(`href="${item.href}"`);
    expect(html).toContain('aria-label="Mobile navigation"');
    expect(html).toContain('href="/account"');
    expect(html).toContain('action="/api/account/logout"');
  });
  it("puts account and cart before the navigation and retains all configured destinations", () => {
    const html = renderToStaticMarkup(createElement(MobileNavigation, props));
    expect(html.indexOf('href="/account/login"')).toBeLessThan(html.indexOf('<nav'));
    expect(html.indexOf('href="/cart"')).toBeLessThan(html.indexOf('<nav'));
    expect(html).toContain('Cart (3)');
    for (const item of directLinks) expect(html).toContain(`href="${item.href}"`);
    expect(html).toContain('aria-label="Mobile navigation"');
    expect(html).toContain('id="mobile-site-navigation"');
  });

  it("opens direct type choices and marks the current category", () => {
    const html = renderToStaticMarkup(createElement(MobileNavigation, { ...props, pathname: "/category/reviews" }));
    expect(html).toMatch(/<details[^>]*><summary[^>]*><span>Shop by Type<\/span>/);
    for (const slug of ["reviews", "social-media", "appointments", "menu", "feedback", "website-link-stands"]) {
      expect(html).toContain(`href="/category/${slug}"`);
    }
    expect(html).toMatch(/aria-current="page"[^>]*href="\/category\/reviews"/);
    expect(html).not.toContain('href="/shop#stand-types"');
    expect(html).not.toContain('href="/custom-stands"');
  });

  it("marks the shop link when browsing the full catalog", () => {
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
