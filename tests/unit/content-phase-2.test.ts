import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import { getBusinessUsePageCopy } from "@/lib/business-use-content";
import { getProductPageHighlights } from "@/lib/product-page-content";
import { defaultHomepageContent } from "@/lib/website-content";
import { getDefaultShippingSettings } from "@/lib/shipping-settings";
import { ProductPhysicalDetailsEditor } from "@/components/admin/product-physical-details-editor";
import { ProductCard } from "@/components/product/product-card";

const mocks = vi.hoisted(() => ({ home: vi.fn(), shipping: vi.fn() }));
vi.mock("@/lib/website-content", async original => ({ ...await original<typeof import("@/lib/website-content")>(), getHomepageThemeContent: mocks.home }));
vi.mock("@/lib/shipping-settings", async original => ({ ...await original<typeof import("@/lib/shipping-settings")>(), getShippingSettings: mocks.shipping }));
import CustomStandsPage from "@/app/custom-stands/page";
import ShippingPage from "@/app/shipping/page";

beforeEach(() => {
  mocks.home.mockResolvedValue(defaultHomepageContent);
  mocks.shipping.mockResolvedValue(getDefaultShippingSettings());
});

describe("content phase 2", () => {
  it("takes custom-stand shoppers to eligible catalog products, not back to the same page", async () => {
    const html = renderToStaticMarkup(await CustomStandsPage());
    expect(html).toContain('href="/shop?design=branded"');
    expect(html).toContain("Shop Branded + QR stands");
    expect(html).not.toContain('href="/custom-stands"');
    expect(html).toContain("Branded + QR stands</h1>");
  });

  it("does not change the homepage custom-branding destination", () => {
    expect(defaultHomepageContent.customBranding.cta.href).toBe("/custom-stands");
  });

  it.each([
    { description: "Restaurant stands", longContent: "Restaurant stands" },
    { description: "Fallback", shortDescription: " Restaurant stands ", longContent: "RESTAURANT   stands" },
    { description: "Restaurant stands", longContent: "Restaurant\nstands" }
  ])("does not render a repeated solution intro: %j", input => {
    expect(getBusinessUsePageCopy(input).body).toBe("");
  });

  it("removes only a matching leading paragraph, retaining distinct long-form content", () => {
    const input = { description: "Restaurant stands", longContent: "Restaurant stands\r\n\r\nMenus and booking.\n\nMore details." };
    expect(getBusinessUsePageCopy(input)).toEqual({ intro: "Restaurant stands", body: "Menus and booking.\n\nMore details." });
    expect(input.longContent).toContain("Restaurant stands");
    expect(getBusinessUsePageCopy({ description: "Our stands", longContent: "Our stands work indoors." }).body).toBe("Our stands work indoors.");
  });

  it.each([
    ["menu", "menu URL"], ["booking", "booking URL"], ["social", "social profile"],
    ["website", "website link"], ["feedback", "feedback form"]
  ])("uses action-specific product prompts for %s", (destinationType, target) => {
    const product = { ...migratedProducts[0], primaryPlatformSlug: "custom-url", destinationType,
      keyFeatures: undefined, requiresLandingPage: false, productKind: "normal_direct" as const, serviceMode: "basic_redirect" as const };
    const prompt = getProductPageHighlights(product).find(item => item.title === "Simple customer prompt")!;
    expect(prompt.body).toContain(target);
    expect(prompt.body).not.toContain("share their experience");
    const saved = { ...product, keyFeatures: [{ title: "Our prompt", body: "A clear physical prompt helps staff invite customers to share their experience at the right moment." }] };
    expect(getProductPageHighlights(saved)[0].body).toBe(prompt.body);
  });

  it("labels shipping costs accurately without inventing preparation/transit estimates", async () => {
    const html = renderToStaticMarkup(await ShippingPage());
    expect(html).toContain("Shipping costs");
    expect(html).toContain("Standard preparation");
    expect(html).toContain("Branded preparation");
    expect(html).not.toContain("Shipping timelines");
    expect(html).not.toContain("Preparation time</h2>");
    expect(html).not.toMatch(/\d+[- ]\d+ business days/);
  });

  it("displays merchant-approved preparation notes, preserving separate lines", async () => {
    mocks.shipping.mockResolvedValue({ ...getDefaultShippingSettings(), handlingTimeText: "Standard: owner-approved estimate.\nBranded: owner-approved estimate." });
    const html = renderToStaticMarkup(await ShippingPage());
    expect(html).toContain("Preparation time</h2>");
    expect(html).toContain("Standard: owner-approved estimate.");
    expect(html).toContain("Branded: owner-approved estimate.");
    expect(html).toContain("whitespace-pre-line");
  });

  it("shows branded option pricing without changing regular catalog prices", () => {
    const product = migratedProducts.find(item => item.slug === "google-review-stand")!;
    const branded = renderToStaticMarkup(createElement(ProductCard, { product, design: "branded" }));
    expect(branded).toContain("Branded + QR: $49");
    expect(branded).not.toContain("From $39");
    expect(renderToStaticMarkup(createElement(ProductCard, { product }))).toContain("From $39");
  });
});

describe("admin physical details editor", () => {
  const onChange = vi.fn();
  it("edits existing specs and contents with bounded, labeled fields", () => {
    const html = renderToStaticMarkup(createElement(ProductPhysicalDetailsEditor, {
      specifications: [{ label: "Material", value: "Acrylic" }], includedItems: [{ label: "1 stand", appliesTo: "all" }],
      onSpecificationsChange: onChange, onIncludedItemsChange: onChange
    }));
    expect(html).toContain('aria-label="Specification 1 name"');
    expect(html).toContain('value="Acrylic"');
    expect(html).toContain('maxLength="300"');
    expect(html).toContain('pattern=".*\\S.*"');
    expect(html).toContain('aria-label="Remove specification 1"');
    expect(html).toContain('aria-label="Remove included item 1"');
    expect(html).toContain('value="branded"');
    expect(html).toContain("Branded + QR only");
  });

  it("leaves unconfirmed details empty instead of pre-filling suggested facts", () => {
    const html = renderToStaticMarkup(createElement(ProductPhysicalDetailsEditor, {
      specifications: [], includedItems: [], onSpecificationsChange: onChange, onIncludedItemsChange: onChange
    }));
    expect(html).toContain("No specifications added.");
    expect(html).toContain("No package contents added.");
    expect(html).not.toContain("A4");
    expect(html).not.toContain("Acrylic");
  });

  it("caps additions at the backend's 40-item limit", () => {
    const html = renderToStaticMarkup(createElement(ProductPhysicalDetailsEditor, {
      specifications: Array.from({ length: 40 }, (_, i) => ({ label: `Specification ${i}`, value: "Value" })),
      includedItems: Array.from({ length: 40 }, (_, i) => ({ label: `Item ${i}`, appliesTo: "all" as const })),
      onSpecificationsChange: onChange, onIncludedItemsChange: onChange
    }));
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });
});
