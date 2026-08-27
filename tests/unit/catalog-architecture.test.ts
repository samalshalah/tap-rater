import { describe, expect, it } from "vitest";
import {
  brandedQrDirectProductOption,
  getProductAssetReadiness,
  hostedMultiLinkProductOption,
  lockedBusinessUses,
  lockedPlatforms,
  lockedStandTypes,
  standardDirectProductOption
} from "@/lib/catalog-architecture";
import { getDefaultOptionsForProductKind, getProductOptionsFromClient, normalizeProductOptionRow } from "@/lib/catalog-architecture-repository";

describe("catalog architecture", () => {
  it("defines the locked stand types and business uses", () => {
    expect(lockedStandTypes.map((standType) => standType.slug)).toEqual([
      "review-stands",
      "social-media-stands",
      "appointment-reservation-stands",
      "feedback-survey-stands",
      "menu-info-stands",
      "website-link-stands",
      "payment-tip-donation-stands",
      "loyalty-rewards-stands",
      "custom-stands"
    ]);
    expect(lockedBusinessUses.map((businessUse) => businessUse.slug)).toEqual([
      "automotive",
      "restaurant-food",
      "hotel-travel",
      "healthcare-dental",
      "home-services",
      "legal",
      "real-estate",
      "beauty-salon-wellness",
      "ecommerce-online-brand",
      "retail-local-business"
    ]);
  });

  it("keeps platforms separate from stand types", () => {
    expect(lockedPlatforms.find((platform) => platform.slug === "vagaro")).toMatchObject({
      title: "Vagaro",
      destinationType: "booking"
    });
    expect(lockedStandTypes.some((standType) => standType.slug.includes("vagaro"))).toBe(false);
  });

  it("models Standard Direct and Branded + QR as setup options", () => {
    expect(standardDirectProductOption).toMatchObject({
      optionCode: "standard_direct",
      priceCents: 3900,
      hasQr: false,
      requiresLogo: false,
      requiresBusinessName: false,
      requiresDesignStep: false,
      requiresFrontProof: false
    });
    expect(brandedQrDirectProductOption).toMatchObject({
      optionCode: "branded_qr_direct",
      priceCents: 4900,
      hasQr: true,
      requiresLogo: true,
      requiresBusinessName: true,
      requiresDesignStep: true,
      requiresFrontProof: true
    });
  });

  it("models Hosted Multi-Link as a special subscribed option template", () => {
    expect(hostedMultiLinkProductOption).toMatchObject({
      optionCode: "hosted_multilink",
      priceCents: 4900,
      monthlyPriceCents: 990,
      requiresSubscription: true,
      accountRequired: true,
      hasQr: true,
      maxLinks: 10,
      supportsReorderableLinks: true,
      supportsLinkVisibility: true,
      landingPageUrlPattern: "/l/:client-name",
      footerLabel: "Powered by Tap Rater"
    });
    expect(getDefaultOptionsForProductKind("hosted_multilink")).toEqual([hostedMultiLinkProductOption]);
  });

  it("keeps products in draft when required assets or options are missing", () => {
    expect(getProductAssetReadiness({ productKind: "normal_direct", assetSet: {} }, [])).toEqual({
      status: "draft_missing_assets",
      missing: ["At least one active product option"]
    });

    expect(getProductAssetReadiness({ productKind: "normal_direct", assetSet: {} }, [standardDirectProductOption])).toEqual({
      status: "draft_missing_assets",
      missing: ["Standard Direct angled image"]
    });

    expect(getProductAssetReadiness({ productKind: "normal_direct", images: [{ src: "/main-product.png" }] }, [standardDirectProductOption])).toEqual({
      status: "ready",
      missing: []
    });

    expect(getProductAssetReadiness({ productKind: "normal_direct", assetSet: {} }, [brandedQrDirectProductOption])).toEqual({
      status: "draft_missing_assets",
      missing: ["Branded + QR front template"]
    });

    expect(
      getProductAssetReadiness(
        {
          productKind: "normal_direct",
          assetSet: {
            standardAngledImageUrl: "/standard.png"
          }
        },
        [standardDirectProductOption]
      )
    ).toEqual({ status: "ready", missing: [] });

    expect(
      getProductAssetReadiness(
        {
          productKind: "normal_direct",
          assetSet: {
            standardAngledImageUrl: "/standard.png",
            brandedAngledImageUrl: "/branded.png",
            brandedFrontTemplateUrl: "/front.png",
            centerAssetUrl: "/center.svg"
          }
        },
        [standardDirectProductOption, brandedQrDirectProductOption]
      )
    ).toEqual({ status: "ready", missing: [] });

    expect(
      getProductAssetReadiness(
        {
          productKind: "hosted_multilink",
          assetSet: {
            multiLinkAngledImageUrl: "/uploads/products/hosted-multilink.png",
            multiLinkFrontTemplateUrl: "/uploads/templates/hosted-multilink-front.png",
            landingPagePreviewConfig: { maxLinks: 10 }
          }
        },
        [hostedMultiLinkProductOption]
      )
    ).toEqual({ status: "ready", missing: [] });
  });

  it("normalizes product options from database rows", () => {
    expect(
      normalizeProductOptionRow({
        product_slug: "google-review-stand",
        option_code: "branded_qr_direct",
        title: "Branded + QR Direct",
        description: "Branded stand",
        price_cents: 4900,
        monthly_price_cents: null,
        max_links: null,
        requires_destination_url: true,
        has_qr: true,
        requires_logo: true,
        requires_business_name: true,
        requires_design_step: true,
        requires_front_proof: true,
        requires_subscription: false,
        account_required: false,
        supports_reorderable_links: false,
        supports_link_visibility: false,
        landing_page_url_pattern: null,
        footer_label: null,
        is_active: true,
        sort_order: 20
      })
    ).toMatchObject({
      productSlug: "google-review-stand",
      optionCode: "branded_qr_direct",
      priceCents: 4900,
      hasQr: true,
      requiresLogo: true
    });
  });

  it("reads active product options through the architecture repository", async () => {
    const calls: { table?: string; filters: { column: string; value: unknown }[]; orders: string[] } = {
      filters: [],
      orders: []
    };
    const client = {
        from(table: string) {
          calls.table = table;
          const builder = {
            select() {
              return builder;
            },
            eq(column: string, value: unknown) {
              calls.filters.push({ column, value });
              return builder;
            },
            order(column: string) {
              calls.orders.push(column);
              return Promise.resolve({
                data: [
                  {
                    product_slug: "google-review-stand",
                    option_code: "standard_direct",
                    title: "Standard Direct",
                    price_cents: 3900,
                    is_active: true,
                    sort_order: 10
                  }
                ],
                error: null
              });
            }
          };
          return builder;
        }
      } as any;
    const result = await getProductOptionsFromClient(client, "google-review-stand");

    expect(calls.table).toBe("product_options");
    expect(calls.filters).toEqual([
      { column: "product_slug", value: "google-review-stand" },
      { column: "is_active", value: true }
    ]);
    expect(calls.orders).toEqual(["sort_order"]);
    expect(result[0]).toMatchObject({ optionCode: "standard_direct", priceCents: 3900 });
  });
});
