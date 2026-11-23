import { describe, expect, it } from "vitest";
import { buildInitialDraft, readHostedPageHeadline } from "@/lib/hosted-provisioning-model";
import { renderHostedPageDraftPreview } from "@/lib/hosted-page-editor-draft";
import type { OrderLineItem } from "@/lib/orders";
import type { HostedPageEditorRecord } from "@/lib/hosted-page-editor-shared";

function item(productId: string, setup: Record<string, unknown> = {}) {
  return { productId, title: productId, sku: "SKU", quantity: 1, unitAmountCents: 4600, lineSubtotalCents: 4600, setup } as OrderLineItem;
}

function page(draft: Partial<HostedPageEditorRecord["draft"]>): HostedPageEditorRecord {
  return {
    id: "p", customerId: "c", customerEmail: "owner@example.com", businessId: "b", businessName: "Main Street Motors",
    code: "ABCDEFGHJKM2", lifecycleStatus: "ACTIVE",
    draft: { businessName: "Main Street Motors", appearance: { theme: "light", accentColor: "#0f766e" }, buttons: [{ id: "g", type: "google_review", label: "Google Review", url: "https://example.com/g", enabled: true, position: 0 }], ...draft }
  };
}

describe("Multi-Link page heading", () => {
  it("matches the wording printed on the stand", () => {
    expect(readHostedPageHeadline(item("rate-your-experience-stand"), "Main Street Motors")).toBe("Rate Your Experience");
    expect(readHostedPageHeadline(item("custom-direct-stand", { headline: "Tell Us How We Did" }), "Main Street Motors")).toBe("Tell Us How We Did");
    expect(readHostedPageHeadline(item("unknown-stand"), "Main Street Motors")).toBe("Main Street Motors");
  });

  it("starts new pages with the stand heading and keeps the business name", () => {
    const draft = buildInitialDraft("Main Street Motors", "https://example.com/logo.png", [], "Rate Your Experience");
    expect(draft).toMatchObject({ businessName: "Main Street Motors", headline: "Rate Your Experience", logoUrl: "https://example.com/logo.png" });
    expect(buildInitialDraft("Main Street Motors").headline).toBe("Main Street Motors");
  });

  it("shows logo, business name and heading, with the footer linking to Tap Rater", () => {
    const html = renderHostedPageDraftPreview(page({ headline: "Rate Your Experience", logoUrl: "https://example.com/logo.png" }));
    expect(html).toContain('<img class="tr-logo" src="https://example.com/logo.png"');
    expect(html).toContain('<p class="tr-business">Main Street Motors</p>');
    expect(html).toContain("<h1>Rate Your Experience</h1>");
    expect(html).toContain('<a href="https://taprater.com/" target="_blank" rel="noopener">Powered by Tap Rater</a>');
    expect(renderHostedPageDraftPreview(page({ headline: "Main Street Motors" }))).not.toContain('<p class="tr-business">');
  });
});
