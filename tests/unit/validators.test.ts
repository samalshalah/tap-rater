import { describe, expect, it } from "vitest";
import {
  accountChangeRequestSchema,
  accountLoginRequestSchema,
  accountLoginVerifySchema,
  activationFormSchema,
  adminProductDeleteSchema,
  changeLinkFormSchema,
  contactFormSchema,
  setupFormSchema
} from "@/lib/validators";

describe("backend validators", () => {
  it("accepts a contact request", () => {
    const form = contactFormSchema.parse({
      name: "Tap Rater Customer",
      email: "customer@example.com",
      message: "I need help choosing a review stand."
    });

    expect(form.email).toBe("customer@example.com");
  });

  it("rejects an invalid setup URL", () => {
    expect(() =>
      setupFormSchema.parse({
        name: "Customer",
        email: "customer@example.com",
        businessName: "Local Shop",
        reviewUrl: "not-a-url",
        notes: ""
      })
    ).toThrow();
  });

  it("accepts a change-link request with a TapRater ID", () => {
    const form = changeLinkFormSchema.parse({
      name: "Customer",
      email: "customer@example.com",
      tapraterId: "TRATER01-W",
      newReviewUrl: "https://example.com/review",
      notes: ""
    });

    expect(form.tapraterId).toBe("TRATER01-W");
  });

  it("accepts a device activation request with a safe destination URL", () => {
    const form = activationFormSchema.parse({
      deviceCode: "tr123",
      activationCode: "private-code",
      email: "customer@example.com",
      name: "Customer",
      businessName: "Local Shop",
      destinationType: "google_review_url",
      destinationUrl: "https://g.page/r/local-shop"
    });

    expect(form.destinationType).toBe("google_review_url");
  });

  it("accepts selected Google place metadata on activation", () => {
    const form = activationFormSchema.parse({
      deviceCode: "TR123",
      activationCode: "private-code",
      email: "customer@example.com",
      name: "Customer",
      businessName: "",
      destinationType: "google_review_url",
      destinationUrl: "https://search.google.com/local/writereview?placeid=ChIJLocalShop",
      googlePlaceId: "ChIJLocalShop",
      googlePlaceName: "Local Shop",
      googleFormattedAddress: "123 Main St, Phoenix, AZ"
    });

    expect(form.googlePlaceId).toBe("ChIJLocalShop");
  });

  it("rejects unsafe activation destination URLs", () => {
    expect(() =>
      activationFormSchema.parse({
        deviceCode: "TR123",
        activationCode: "private-code",
        email: "customer@example.com",
        name: "Customer",
        businessName: "Local Shop",
        destinationType: "direct_url",
        destinationUrl: "javascript:alert(1)"
      })
    ).toThrow();
  });

  it("accepts account login and change request payloads", () => {
    expect(accountLoginRequestSchema.parse({ email: "owner@example.com" }).email).toBe("owner@example.com");
    expect(accountLoginVerifySchema.parse({ token: "signed-token" }).token).toBe("signed-token");
    expect(
      accountChangeRequestSchema.parse({
        tapraterId: "TR-TEST123",
        newReviewUrl: "https://example.com/new-review",
        notes: "Please update this device."
      }).tapraterId
    ).toBe("TR-TEST123");
  });

  it("accepts the ecommerce product model fields separate from device product types", async () => {
    const { productContentSchema } = await import("@/lib/validators");
    const product = productContentSchema.parse({
      slug: "platform-feedback-stand",
      title: "Platform Feedback Stand",
      sku: "TR-PLATFORM",
      categorySlug: "feedback-referral-stands",
      basePriceCents: 4900,
      stockStatus: "instock",
      shortDescription: "Hosted feedback product.",
      description: "Hosted feedback product with Tap Rater landing page support.",
      productType: "platform_landing_page",
      serviceMode: "hosted_landing_page",
      checkoutMode: "subscription",
      requiresAccount: true,
      requiresSubscription: true,
      requiresLandingPage: true,
      supportedDestinations: ["google", "feedback", "custom"],
      activationType: "premium_hosted_activation",
      includedServiceLabel: "Premium landing page",
      customizationOptions: ["standard_design", "custom_design"],
      allowsLogoUpload: false,
      allowsCustomDesign: true,
      designMode: "custom",
      isActive: true
    });

    expect(product.productType).toBe("platform_landing_page");
    expect(product.serviceMode).toBe("hosted_landing_page");
    expect(product.checkoutMode).toBe("subscription");
    expect(product.requiresAccount).toBe(true);
    expect(product.supportedDestinations).toEqual(["google", "feedback", "custom"]);
    expect(product.customizationOptions).toEqual(["standard_design", "custom_design"]);
    expect(product.allowsCustomDesign).toBe(true);
    expect(product.designMode).toBe("custom");
  });

  it("validates admin product bulk delete payloads by slug only", () => {
    expect(adminProductDeleteSchema.parse({ slugs: ["google-review-stand", "yelp-review-stand"] }).slugs).toEqual([
      "google-review-stand",
      "yelp-review-stand"
    ]);

    expect(() => adminProductDeleteSchema.parse({ slugs: [] })).toThrow();
    expect(() => adminProductDeleteSchema.parse({ slugs: ["../../products"] })).toThrow();
  });
});
