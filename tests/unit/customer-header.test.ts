import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ authenticated: false, pathname: "/shop" }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("@/components/cart/cart-provider", () => ({ useCart: () => ({ count: 0 }) }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => actual.useState(
      initial && typeof initial === "object" && "authenticated" in initial
        ? { authenticated: state.authenticated, name: "Alex" }
        : initial,
    ),
  };
});

import { Header } from "@/components/layout/header";

describe("customer header", () => {
  beforeEach(() => { state.authenticated = false; state.pathname = "/shop"; });

  it("keeps storefront navigation for guests", () => {
    const html = renderToStaticMarkup(createElement(Header));
    expect(html).toContain('aria-label="Main navigation"');
    expect(html).toContain("Shop by Type");
    expect(html).toContain('href="/account/login"');
    expect(html).not.toContain("Orders &amp; Billing");
  });

  it("replaces storefront links with customer navigation even on a store page", () => {
    state.authenticated = true;
    const html = renderToStaticMarkup(createElement(Header));
    expect(html).toContain('aria-label="Customer navigation"');
    for (const route of ["/account", "/account/stands", "/account/reviews", "/account/local", "/account/heatmap", "/account/orders"]) {
      expect(html).toContain(`href="${route}"`);
    }
    expect(html).not.toContain("Shop by Type");
    expect(html).not.toContain("How It Works");
    expect(html).toContain("Welcome, Alex");
  });

  it("highlights the customer section on nested pages without highlighting Overview", () => {
    state.authenticated = true;
    state.pathname = "/account/orders/example";
    const html = renderToStaticMarkup(createElement(Header));
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="page"[^>]*href="\/account\/orders"/);
  });
});
