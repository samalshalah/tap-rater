import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CustomerStandsManager } from "@/components/account/customer-stands-manager";
import { StandPreview } from "@/components/account/stand-preview";
import type { CustomerPortalStand } from "@/lib/customer-portal";
import type { HostedPageEditorRecord } from "@/lib/hosted-page-editor-shared";

const stand: CustomerPortalStand = {
  id: "qa-stand", orderId: "qa-order", lineItemIndex: 0,
  orderReference: `cs_test_${"a".repeat(70)}`, title: "Google Review Stand", quantity: 1,
  kind: "standard", proofStatus: "not_needed", productionStatus: "blocked", shippingStatus: "not_shipped",
  primaryActionLabel: "View details", primaryActionHref: "/account/orders", multiLinkSetupPending: false
};

describe("customer stand history", () => {
  it("offers the branded stand preview separately from Multi-Link editing", () => {
    const html = renderToStaticMarkup(createElement(CustomerStandsManager, {
      stands: [{ ...stand, kind: "multilink", proofStatus: "approved", proofPreviewUrl: "/api/account/orders/qa/artwork/0" }],
      hostedPages: { [stand.id]: { code: "PAGE1" } as HostedPageEditorRecord }
    }));
    expect(html).toContain("View stand preview");
    expect(html).toContain("Manage links");
  });

  it("shows a saved preview or an explicit unavailable state, never an empty image source", () => {
    const html = renderToStaticMarkup(createElement(StandPreview, { title: "Google Review Stand", url: "/api/account/orders/qa/artwork/0" }));
    expect(html).toContain('src="/api/account/orders/qa/artwork/0"');
    expect(html).toContain('alt="Google Review Stand preview"');
    const missing = renderToStaticMarkup(createElement(StandPreview, { title: "Google Review Stand" }));
    expect(missing).toContain("No saved stand preview is available");
    expect(missing).not.toContain("<img");
  });

  it.each(["expired", "unpaid", "refunded"])("offers billing instead of setup for an unprovisioned %s stand", (paymentStatus) => {
    const html = renderToStaticMarkup(createElement(CustomerStandsManager, {
      stands: [{ ...stand, kind: "multilink", paymentStatus }]
    }));
    expect(html).toContain("View billing");
    expect(html).toContain('href="/account/orders#invoices"');
    expect(html).not.toContain("#order-");
    expect(html).not.toContain("Set up landing page");
    expect(html).not.toContain("Manage links");
    expect(html).not.toContain("<button");
  });

  it("offers details while paid setup is pending", () => {
    const html = renderToStaticMarkup(createElement(CustomerStandsManager, {
      stands: [{ ...stand, kind: "multilink", paymentStatus: "paid", multiLinkSetupPending: true }]
    }));
    expect(html).toContain("View stand");
    expect(html).not.toContain("Set up landing page");
  });

  it("keeps the editor action for a provisioned page after an order refund", () => {
    const html = renderToStaticMarkup(createElement(CustomerStandsManager, {
      stands: [{ ...stand, kind: "multilink", paymentStatus: "refunded", hostedPageCode: "PAGE1" }],
      hostedPages: { [stand.id]: { code: "PAGE1" } as HostedPageEditorRecord }
    }));
    expect(html).toContain("Manage links");
    expect(html).not.toContain("Set up landing page");
  });

  it.each([
    ["unpaid", "Payment pending"], ["manual_unpaid", "Payment pending review"],
    ["refunded", "refunded"], ["paid", "paid"]
  ])("retains the %s stand with its payment status", (paymentStatus, label) => {
    const html = renderToStaticMarkup(createElement(CustomerStandsManager, { stands: [{ ...stand, paymentStatus }] }));
    expect(html).toContain(label);
    expect(html).toContain("Google Review Stand");
    expect(html).toContain(`Order ${stand.orderReference}`);
    expect(html).not.toContain("#order-");
    expect(html).toContain("break-all");
  });

  it("does not describe an empty or unpaid history as purchased", () => {
    const html = renderToStaticMarkup(createElement(CustomerStandsManager, { stands: [] }));
    expect(html).toContain("No stands are linked");
    expect(html).not.toContain("purchased");
  });
});
