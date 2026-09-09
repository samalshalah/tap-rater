import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountPage from "@/app/account/page";
import AccountStandsPage from "@/app/account/stands/page";
import type { CustomerPortalData, CustomerPortalStand } from "@/lib/customer-portal";

const { getCustomerPortal, getHostedPageEditorContext, manager } = vi.hoisted(() => ({
  getCustomerPortal: vi.fn(), getHostedPageEditorContext: vi.fn(), manager: vi.fn()
}));
vi.mock("@/lib/customer-auth", () => ({ requireCustomer: async () => ({ email: "owner@example.com" }) }));
vi.mock("@/components/account/account-shell", () => ({ AccountShell: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/lib/customer-portal", async (importOriginal) => ({ ...await importOriginal<object>(), getCustomerPortal }));
vi.mock("@/lib/hosted-page-editor", () => ({ getHostedPageEditorContext }));
vi.mock("@/components/account/customer-stands-manager", () => ({ CustomerStandsManager: (props: unknown) => { manager(props); return createElement("div"); } }));

const stand: CustomerPortalStand = {
  id: "stand-1", orderId: "order-1", orderReference: "order-1", lineItemIndex: 0,
  title: "Google Review Stand", quantity: 1, kind: "multilink", paymentStatus: "paid",
  proofStatus: "not_needed", productionStatus: "completed", shippingStatus: "delivered",
  primaryActionLabel: "Manage links", primaryActionHref: "/account/stands", multiLinkSetupPending: false
};

function portal(stands: CustomerPortalStand[]): CustomerPortalData {
  return {
    configured: true, customer: { id: "customer-1", email: "owner@example.com" },
    businesses: [], devices: [], orders: [], invoices: [], stands,
    subscriptions: ["PAGE1", "PAGE2"].map((code) => ({
      id: code, permanentCode: code, hostedPageUrl: `https://taprater.com/p/${code}`,
      status: "active", lifecycleStatus: "ACTIVE", cancelAtPeriodEnd: false, billingProfileAvailable: true
    }))
  };
}

beforeEach(() => vi.resetAllMocks());

describe("customer Multi-Link dashboard and editor mapping", () => {
  it("shows two pages, not four order lines, and no expired setup reminder", async () => {
    getCustomerPortal.mockResolvedValue(portal([
      { ...stand, hostedPageCode: "PAGE1", paymentStatus: "refunded" },
      { ...stand, id: "stand-2", hostedPageCode: "PAGE2" },
      { ...stand, id: "stand-3", paymentStatus: "expired" },
      { ...stand, id: "stand-4", paymentStatus: "expired" }
    ]));
    const html = renderToStaticMarkup(await AccountPage());
    expect(html).toMatch(/Multi-Link pages<\/p><p[^>]*>2<\/p>/);
    expect(html).not.toContain("Multi-Link setup is pending");
    expect(html).toContain("Manage Multi-Link page");
  });

  it("retains a real paid provisioning reminder", async () => {
    getCustomerPortal.mockResolvedValue(portal([{ ...stand, multiLinkSetupPending: true }]));
    expect(renderToStaticMarkup(await AccountPage())).toContain("Multi-Link setup is pending");
  });

  it("never loads the default editor for a stand without a page code", async () => {
    const stands = [
      { ...stand, hostedPageCode: "PAGE1", paymentStatus: "refunded" },
      { ...stand, id: "expired", paymentStatus: "expired" },
      { ...stand, id: "pending", multiLinkSetupPending: true },
      { ...stand, id: "url-only", hostedPageUrl: "https://taprater.com/p/PAGE2" }
    ];
    getCustomerPortal.mockResolvedValue(portal(stands));
    const page = { id: "page-1", code: "PAGE1" };
    getHostedPageEditorContext.mockResolvedValue({ configured: true, page });
    renderToStaticMarkup(await AccountStandsPage());
    expect(getHostedPageEditorContext).toHaveBeenCalledExactlyOnceWith("owner@example.com", "PAGE1");
    expect(manager).toHaveBeenCalledWith({ stands, hostedPages: { "stand-1": page } });
  });

  it.each([null, { code: "WRONG_PAGE" }])("does not attach a missing or mismatched page: %j", async (page) => {
    const stands = [{ ...stand, hostedPageCode: "PAGE1" }];
    getCustomerPortal.mockResolvedValue(portal(stands));
    getHostedPageEditorContext.mockResolvedValue({ configured: true, page });
    renderToStaticMarkup(await AccountStandsPage());
    expect(manager).toHaveBeenCalledWith({ stands, hostedPages: {} });
  });
});
