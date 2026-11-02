import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ authenticated: false, pathname: "/shop", service: true, stands: true, multilink: true }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("@/components/cart/cart-provider", () => ({ useCart: () => ({ count: 0 }) }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => actual.useState(
      initial && typeof initial === "object" && "authenticated" in initial
        ? { authenticated: state.authenticated, name: "Alex", service: state.service, stands: state.stands, multilink: state.multilink }
        : initial,
    ),
  };
});

import { Header } from "@/components/layout/header";

describe("customer header", () => {
  beforeEach(() => { state.authenticated = false; state.pathname = "/shop"; state.service = state.stands = state.multilink = true; });

  it("keeps storefront navigation for guests", () => {
    const html = renderToStaticMarkup(createElement(Header));
    expect(html).toContain('aria-label="Main navigation"');
    expect(html).toContain("Shop by Type");
    expect(html).toContain('href="/account/login"');
    expect(html).not.toContain("Orders &amp; Billing");
  });

  it("keeps the same shopping destinations after sign-in", () => {
    state.authenticated = true;
    const html = renderToStaticMarkup(createElement(Header));
    expect(html).toContain('aria-label="Main navigation"');
    expect(html).toContain("Shop by Type");
    expect(html).toContain("How It Works");
    expect(html).toContain("Welcome, Alex");
    expect(html).not.toContain('href="/account/orders"');
    expect(html).not.toContain('href="/account/locations"');
    expect(html).toMatch(/<a[^>]*href="\/"[^>]*><img[^>]*alt="Tap Rater"/);
  });
});
