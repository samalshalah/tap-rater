import { z } from "zod";

const productCustomizationOptions = ["standard_design", "add_logo", "custom_design"] as const;
const productFormats = ["stand", "plate", "bundle", "platform"] as const;
const productStatuses = ["draft", "active", "archived"] as const;
const productKinds = ["normal_direct", "custom_direct", "bundle"] as const;
const destinationTypes = [
  "review",
  "review_social",
  "booking",
  "menu",
  "menu_order",
  "order",
  "reservation",
  "website",
  "social",
  "payment",
  "loyalty",
  "custom"
] as const;
const productOptionCodes = ["standard_direct", "branded_qr_direct", "hosted_multilink"] as const;
const productAssetReadinessStatuses = ["draft_missing_assets", "ready", "blocked"] as const;
const supportedDestinationValues = [
  "google",
  "facebook",
  "yelp",
  "tripadvisor",
  "trustpilot",
  "bbb",
  "nextdoor",
  "avvo",
  "taskrabbit",
  "martindale",
  "justia",
  "findlaw",
  "lawyers",
  "zillow",
  "realtor",
  "homes",
  "apartments",
  "trulia",
  "dealerrater",
  "autotrader",
  "carfax",
  "edmunds",
  "cars",
  "cargurus",
  "repairpal",
  "surecritic",
  "homeadvisor",
  "thumbtack",
  "houzz",
  "porch",
  "instagram",
  "tiktok",
  "linkedin",
  "x",
  "youtube",
  "snapchat",
  "pinterest",
  "whatsapp",
  "telegram",
  "airbnb",
  "agoda",
  "vrbo",
  "hotels",
  "healthgrades",
  "vitals",
  "ratemds",
  "caredash",
  "opencare",
  "styleseat",
  "vagaro",
  "booksy",
  "fresha",
  "zocdoc",
  "calendly",
  "acuity",
  "square-appointments",
  "custom-booking-url",
  "booking",
  "toast",
  "doordash",
  "ubereats",
  "angi",
  "grubhub",
  "opentable",
  "resy",
  "custom-menu-url",
  "website",
  "menu",
  "wifi",
  "feedback",
  "referral",
  "payment-url",
  "loyalty-url",
  "custom-url",
  "custom"
] as const;
const productImageSchema = z.object({
  src: z.string().trim().min(1).max(2048),
  alt: z.string().trim().max(300).default("")
});
const productOptionSchema = z.object({
  optionCode: z.enum(productOptionCodes),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).default(""),
  priceCents: z.number().int().min(0),
  monthlyPriceCents: z.number().int().min(0).optional(),
  maxLinks: z.number().int().min(1).optional(),
  requiresDestinationUrl: z.boolean().default(true),
  hasQr: z.boolean().default(false),
  requiresLogo: z.boolean().default(false),
  requiresBusinessName: z.boolean().default(false),
  requiresDesignStep: z.boolean().default(false),
  requiresFrontProof: z.boolean().default(false),
  requiresSubscription: z.boolean().default(false),
  accountRequired: z.boolean().default(false),
  supportsReorderableLinks: z.boolean().default(false),
  supportsLinkVisibility: z.boolean().default(false),
  landingPageUrlPattern: z.string().trim().max(120).optional(),
  footerLabel: z.string().trim().max(120).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0)
});
const productAssetSetSchema = z.object({
  standardAngledImageUrl: z.string().trim().max(2048).optional(),
  brandedAngledImageUrl: z.string().trim().max(2048).optional(),
  multiLinkAngledImageUrl: z.string().trim().max(2048).optional(),
  standardFrontTemplateUrl: z.string().trim().max(2048).optional(),
  brandedFrontTemplateUrl: z.string().trim().max(2048).optional(),
  multiLinkFrontTemplateUrl: z.string().trim().max(2048).optional(),
  centerAssetUrl: z.string().trim().max(2048).optional(),
  landingPagePreviewConfig: z.record(z.string(), z.unknown()).optional()
});

const productSizeOptionSchema = z.object({
  code: z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/),
  label: z.string().trim().min(1).max(120),
  frontWidthMm: z.number().positive(),
  frontHeightMm: z.number().positive(),
  frontWidthIn: z.number().positive(),
  frontHeightIn: z.number().positive(),
  baseDepthMm: z.number().positive(),
  baseDepthIn: z.number().positive(),
  skuSuffix: z.string().trim().min(1).max(16).regex(/^[A-Z0-9-]+$/),
  priceAdjustmentCents: z.number().int().min(0).nullable(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true)
});

const productColorOptionSchema = z.object({
  code: z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/),
  label: z.string().trim().min(1).max(80),
  skuSuffix: z.string().trim().min(1).max(16).regex(/^[A-Z0-9-]+$/),
  priceAdjustmentCents: z.number().int().min(0).default(0),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true)
});

const productContentBlockSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(500)
});

const productHowItWorksSchema = productContentBlockSchema.extend({
  step: z.number().int().min(1).max(20)
});

const productSpecificationSchema = z.object({
  label: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(300)
});

const productIncludedItemSchema = z.object({
  label: z.string().trim().min(1).max(200),
  appliesTo: z.enum(["all", "branded"]).optional().default("all")
});

const productFaqSchema = z.object({
  question: z.string().trim().min(1).max(220),
  answer: z.string().trim().min(1).max(800)
});

export const contactFormSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  message: z.string().trim().min(10).max(2000)
});

export const setupFormSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  businessName: z.string().trim().min(2).max(160),
  reviewUrl: z.string().trim().url().max(500),
  notes: z.string().trim().max(2000).default("")
});

export const changeLinkFormSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  tapraterId: z.string().trim().min(3).max(80),
  newReviewUrl: z.string().trim().url().max(500),
  notes: z.string().trim().max(2000).default("")
});

export const activationFormSchema = z
  .object({
    deviceCode: z.string().trim().min(3).max(80).regex(/^[A-Za-z0-9-]+$/),
    activationCode: z.string().trim().min(4).max(120),
    email: z.string().trim().email().max(180),
    name: z.string().trim().min(2).max(120),
    businessName: z.string().trim().max(160).default(""),
    destinationType: z.enum(["google_review_url", "direct_url", "facebook_url", "yelp_url", "booking_url", "social_url"]),
    destinationUrl: z
      .string()
      .trim()
      .max(500)
      .refine((value) => {
        try {
          const url = new URL(value);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      }, "Destination URL must start with http or https."),
    googlePlaceId: z.string().trim().max(180).optional().default(""),
    googlePlaceName: z.string().trim().max(180).optional().default(""),
    googleFormattedAddress: z.string().trim().max(300).optional().default("")
  })
  .refine((value) => Boolean(value.businessName || value.googlePlaceName), {
    message: "Business name is required.",
    path: ["businessName"]
  });

export type ContactFormInput = z.infer<typeof contactFormSchema>;
export type SetupFormInput = z.infer<typeof setupFormSchema>;
export type ChangeLinkFormInput = z.infer<typeof changeLinkFormSchema>;
export type ActivationFormInput = z.infer<typeof activationFormSchema>;

export const homepageContentSchema = z.object({
  eyebrow: z.string().trim().min(2).max(120),
  heroTitle: z.string().trim().min(10).max(160),
  heroDescription: z.string().trim().min(20).max(500),
  primaryButtonLabel: z.string().trim().min(2).max(40),
  primaryButtonHref: z.string().trim().min(1).max(120),
  secondaryButtonLabel: z.string().trim().min(2).max(40),
  secondaryButtonHref: z.string().trim().min(1).max(120),
  featuredBadge: z.string().trim().min(2).max(80),
  featuredLabel: z.string().trim().min(2).max(120)
});

export const pageContentSchema = z.object({
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(2).max(160),
  seoTitle: z.string().trim().min(2).max(160),
  seoDescription: z.string().trim().min(10).max(300),
  body: z.string().trim().min(10).max(10000),
  status: z.enum(["draft", "published"])
});

export const productContentSchema = z.object({
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(2).max(180),
  sku: z.string().trim().min(2).max(80),
  categorySlug: z.string().trim().min(2).max(120),
  standTypeSlug: z.string().trim().min(2).max(120).optional(),
  primaryPlatformSlug: z.string().trim().min(1).max(120).optional(),
  destinationType: z.enum(destinationTypes).optional(),
  businessUseSlugs: z.array(z.string().trim().min(2).max(120)).default([]),
  isSpecialSolution: z.boolean().default(false),
  productKind: z.enum(productKinds).default("normal_direct"),
  status: z.enum(productStatuses).default("draft"),
  sortOrder: z.number().int().min(0).max(100000).default(1000),
  basePriceCents: z.number().int().min(0),
  salePriceCents: z.number().int().min(0).optional(),
  stockStatus: z.enum(["instock", "outofstock"]),
  shortDescription: z.string().trim().max(500).default(""),
  description: z.string().trim().max(4000).default(""),
  productType: z.enum(["physical_redirect", "physical_managed", "platform_landing_page", "bundle"]).default("physical_redirect"),
  serviceMode: z.enum(["basic_redirect", "managed_redirect", "hosted_landing_page", "multi_location_platform"]).default("basic_redirect"),
  checkoutMode: z.enum(["buy_now", "request_quote", "subscription", "contact_sales"]).default("buy_now"),
  requiresAccount: z.boolean().default(false),
  requiresSubscription: z.boolean().default(false),
  requiresLandingPage: z.boolean().default(false),
  supportsMultiLink: z.boolean().default(false),
  supportedDestinations: z
    .array(z.enum(supportedDestinationValues))
    .min(1)
    .default(["custom"]),
  activationType: z.enum(["free_basic_activation", "managed_setup", "premium_hosted_activation"]).default("free_basic_activation"),
  includedServiceLabel: z.string().trim().min(2).max(120).default("Free basic activation"),
  format: z.enum(productFormats).default("stand"),
  customizationOptions: z.array(z.enum(productCustomizationOptions)).min(1).default(["standard_design"]),
  allowsLogoUpload: z.boolean().default(false),
  allowsCustomDesign: z.boolean().default(false),
  designMode: z.enum(["standard", "logo", "custom"]).default("standard"),
  displayText: z.string().trim().max(160).optional(),
  assetSet: productAssetSetSchema.default({}),
  defaultCtaText: z.string().trim().max(120).optional(),
  ctaEditable: z.boolean().default(false),
  assetReadinessStatus: z.enum(productAssetReadinessStatuses).default("draft_missing_assets"),
  productOptions: z.array(productOptionSchema).default([]),
  images: z.array(productImageSchema).max(8).default([]),
  seoTitle: z.string().trim().max(180).optional(),
  seoDescription: z.string().trim().max(320).optional(),
  searchKeywords: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
  sizeOptions: z.array(productSizeOptionSchema).max(12).default([]),
  colorOptions: z.array(productColorOptionSchema).max(24).default([]),
  keyFeatures: z.array(productContentBlockSchema).max(20).default([]),
  howItWorks: z.array(productHowItWorksSchema).max(20).default([]),
  specifications: z.array(productSpecificationSchema).max(40).default([]),
  includedItems: z.array(productIncludedItemSchema).max(40).default([]),
  productFaqs: z.array(productFaqSchema).max(30).default([]),
  isActive: z.boolean()
});

export const businessUseContentSchema = z.object({
  originalSlug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/).optional(),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(500).default(""),
  shortDescription: z.string().trim().max(500).default(""),
  longContent: z.string().trim().max(10000).default(""),
  seoTitle: z.string().trim().max(180).optional(),
  seoDescription: z.string().trim().max(320).optional(),
  imageUrl: z.string().trim().max(2048).optional(),
  bannerImageUrl: z.string().trim().max(2048).optional(),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(false),
  productSlugs: z.array(z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/)).max(200).default([])
});

export const standTypeContentSchema = z.object({
  originalSlug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/).optional(),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(500).default(""),
  shortDescription: z.string().trim().max(500).default(""),
  longContent: z.string().trim().max(10000).default(""),
  buyerIntent: z.string().trim().max(500).default(""),
  seoTitle: z.string().trim().max(180).optional(),
  seoDescription: z.string().trim().max(320).optional(),
  imageUrl: z.string().trim().max(2048).optional(),
  bannerImageUrl: z.string().trim().max(2048).optional(),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(false)
});

export const adminProductDeleteSchema = z.object({
  slugs: z
    .array(z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/))
    .min(1)
    .max(250)
});

export const adminProductStatusUpdateSchema = z.object({
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  status: z.enum(productStatuses)
});

export type HomepageContentInput = z.infer<typeof homepageContentSchema>;
export type PageContentInput = z.infer<typeof pageContentSchema>;
export type BusinessUseContentInput = z.infer<typeof businessUseContentSchema>;
export type StandTypeContentInput = z.infer<typeof standTypeContentSchema>;
export type ProductContentInput = z.infer<typeof productContentSchema>;
export type AdminProductStatusUpdateInput = z.infer<typeof adminProductStatusUpdateSchema>;

const deviceProductTypes = [
  "google_review",
  "facebook_review",
  "yelp_profile",
  "appointment_booking",
  "social_follow",
  "wifi_menu",
  "multi_platform_review",
  "feedback_form",
  "referral_form",
  "business_card",
  "custom_url"
] as const;

const deviceServiceModes = ["basic_redirect", "managed_redirect", "premium_landing_page"] as const;
const deviceStatuses = ["unactivated", "active", "paused", "lost", "retired"] as const;
const deviceDestinationTypes = ["google_review", "facebook_review", "yelp_profile", "booking", "social", "menu", "wifi", "custom", "landing_page"] as const;

export const adminDeviceCreateSchema = z.object({
  productType: z.enum(deviceProductTypes),
  serviceMode: z.enum(deviceServiceModes),
  deviceCode: z.string().trim().max(80).regex(/^[A-Za-z0-9-]*$/).optional().default(""),
  activationCode: z.string().trim().max(120).optional().default(""),
  label: z.string().trim().max(160).optional().default("")
});

export const adminDeviceUpdateSchema = z.object({
  status: z.enum(deviceStatuses),
  destinationType: z.union([z.enum(deviceDestinationTypes), z.literal("")]).optional().default(""),
  destinationUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .default("")
    .refine((value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, "Destination URL must start with http or https."),
  label: z.string().trim().max(160).optional().default("")
});

export type AdminDeviceCreateInput = z.infer<typeof adminDeviceCreateSchema>;
export type AdminDeviceUpdateInput = z.infer<typeof adminDeviceUpdateSchema>;

export const accountLoginRequestSchema = z.object({
  email: z.string().trim().email().max(180),
  password: z.string().min(1).max(200)
});

export const accountLoginVerifySchema = z.object({
  token: z.string().trim().min(10).max(1000)
});

export const accountActivateSchema = z.object({
  token: z.string().trim().min(20).max(1000),
  password: z.string().min(8).max(200)
});

export const accountChangeRequestSchema = z.object({
  tapraterId: z.string().trim().min(3).max(80),
  newReviewUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, "New review URL must start with http or https."),
  notes: z.string().trim().max(2000).default("")
});

export type AccountLoginRequestInput = z.infer<typeof accountLoginRequestSchema>;
export type AccountLoginVerifyInput = z.infer<typeof accountLoginVerifySchema>;
export type AccountActivateInput = z.infer<typeof accountActivateSchema>;
export type AccountChangeRequestInput = z.infer<typeof accountChangeRequestSchema>;

export const adminConfigSchema = z.object({
  area: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(2).max(120),
  status: z.enum(["draft", "published"]),
  settings: z.object({
    primary: z.string().trim().min(2).max(300),
    secondary: z.string().trim().min(2).max(300),
    notes: z.string().trim().max(2000).default("")
  })
});

export type AdminConfigInput = z.infer<typeof adminConfigSchema>;

export const shippingSettingsSchema = z.object({
  shippingMode: z.enum(["manual", "free", "flat"]).default("flat"),
  flatShippingAmountCents: z.number().int().min(0).max(100000).default(1200),
  allowedCountryCodes: z
    .array(z.string().trim().regex(/^[A-Z]{2}$/))
    .min(1)
    .max(50)
    .default(["US"]),
  handlingTimeText: z.string().trim().max(500).default(""),
  supportedRegionsText: z.string().trim().max(1000).default("United States"),
  defaultCarrierNotes: z.string().trim().max(1000).default(""),
  customerFacingShippingNote: z
    .string()
    .trim()
    .max(1000)
    .default("Shipping is $12 under $55 and free at $55 or more.")
});

export const taxSettingsSchema = z.object({
  taxMode: z.enum(["manual", "disabled"]).default("manual"),
  manualTaxRateBps: z.number().int().min(0).max(2500).default(600),
  taxLabel: z.string().trim().min(2).max(120).default("Virginia sales tax"),
  taxShipping: z.boolean().default(false),
  customerFacingTaxNote: z.string().trim().max(1000).default("Estimated sales tax is calculated before payment.")
});

export const orderFulfillmentUpdateSchema = z.object({
  productionStatus: z.enum(["not_started", "ready_for_production", "in_production", "blocked", "completed"]),
  shippingStatus: z.enum(["not_shipped", "ready_to_ship", "shipped", "delivered", "blocked"]),
  shippingMethod: z.string().trim().max(120).default(""),
  shippingCarrier: z.string().trim().max(120).default(""),
  trackingNumber: z.string().trim().max(160).default(""),
  trackingUrl: z
    .string()
    .trim()
    .max(500)
    .default("")
    .refine((value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, "Tracking URL must start with http or https."),
  internalNotes: z.string().trim().max(5000).default(""),
  adminFulfillmentNotes: z.string().trim().max(5000).default(""),
  markShipped: z.boolean().default(false)
});

export type ShippingSettingsInput = z.infer<typeof shippingSettingsSchema>;
export type TaxSettingsInput = z.infer<typeof taxSettingsSchema>;
export type OrderFulfillmentUpdateInput = z.infer<typeof orderFulfillmentUpdateSchema>;

export const checkoutCartSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(2).max(160),
        optionId: z.enum(["standard_direct", "branded_qr_direct", "hosted_multilink"]).optional(),
        quantity: z.number().int().min(1).max(99),
        setup: z
          .object({
            productSlug: z.string().trim().max(160).optional(),
            optionCode: z.enum(["standard_direct", "branded_qr_direct", "hosted_multilink"]).optional(),
            baseSku: z.string().trim().max(120).optional(),
            finalSku: z.string().trim().max(160).optional(),
            purchaseOptionLabel: z.string().trim().max(120).optional(),
            sizeCode: z.string().trim().max(40).optional(),
            sizeLabel: z.string().trim().max(120).optional(),
            colorCode: z.string().trim().max(40).optional(),
            colorLabel: z.string().trim().max(80).optional(),
            destinationUrl: z.string().trim().max(500).optional(),
            destinationType: z.string().trim().max(80).optional(),
            serviceMode: z.enum(["DIRECT", "HOSTED"]).optional(),
            serviceAddon: z.string().trim().max(80).optional(),
            monthlyPriceCents: z.number().int().min(0).max(1_000_000).optional(),
            multiLinkButtons: z
              .array(
                z.object({
                  id: z.string().trim().min(1).max(120),
                  type: z.string().trim().min(1).max(60),
                  label: z.string().trim().min(1).max(80),
                  url: z.string().trim().min(1).max(600),
                  enabled: z.boolean(),
                  position: z.number().int().min(0).max(99)
                })
              )
              .max(10)
              .optional(),
            multiLinkLinksSkipped: z.boolean().optional(),
            platformSlug: z.string().trim().max(120).optional(),
            googlePlaceId: z.string().trim().max(180).optional(),
            googlePlaceName: z.string().trim().max(180).optional(),
            businessName: z.string().trim().max(160).optional(),
            headline: z.string().trim().max(160).optional(),
            cta: z.string().trim().max(160).optional(),
            logoFileName: z.string().trim().max(240).optional(),
            logoMediaUrl: z.string().trim().max(600).optional(),
            logoStorageKey: z.string().trim().max(600).optional(),
            originalLogoMediaUrl: z.string().trim().max(600).optional(),
            originalLogoStorageKey: z.string().trim().max(600).optional(),
            designAssistanceRequested: z.boolean().optional(),
            logoBackgroundMode: z.string().trim().max(40).optional(),
            logoFitMode: z.string().trim().max(40).optional(),
            logoOffsetXPercent: z.number().int().min(-100).max(100).optional(),
            logoOffsetYPercent: z.number().int().min(-100).max(100).optional(),
            generatedQrValue: z.string().trim().max(500).optional(),
            qrTargetUrl: z.string().trim().max(500).optional(),
            nfcTargetUrl: z.string().trim().max(500).optional(),
            frontTemplateUrl: z.string().trim().max(600).optional(),
            showBusinessNameOnProof: z.boolean().optional(),
            proofApprovalSnapshot: z.record(z.unknown()).optional(),
            proofApprovedAt: z.string().trim().max(80).optional(),
            proofPreviewData: z.record(z.unknown()).optional(),
            hasQr: z.boolean().optional(),
            nfcOnly: z.boolean().optional(),
            priceCents: z.number().int().min(0).max(1_000_000).optional(),
            designNotes: z.string().trim().max(1000).optional(),
            manualCollectionAcknowledged: z.boolean().optional(),
            proofApproved: z.boolean().optional()
          })
          .optional()
      })
    )
    .max(50)
});

export const checkoutCustomerSchema = z.object({
  email: z.string().trim().email().max(180),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().default(""),
  createAccount: z.boolean().optional().default(false)
});

export const checkoutShippingAddressSchema = z.object({
  name: z.string().trim().min(2).max(120),
  line1: z.string().trim().min(2).max(180),
  line2: z.string().trim().max(180).optional().default(""),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().min(3).max(20),
  country: z.string().trim().regex(/^[A-Z]{2}$/).default("US"),
  phone: z.string().trim().max(40).optional().default("")
});

export const checkoutRequestSchema = checkoutCartSchema.extend({
  customer: checkoutCustomerSchema,
  shippingAddress: checkoutShippingAddressSchema
});

export type CheckoutCartInput = z.infer<typeof checkoutCartSchema>;
export type CheckoutCustomerInput = z.infer<typeof checkoutCustomerSchema>;
export type CheckoutShippingAddressInput = z.infer<typeof checkoutShippingAddressSchema>;
export type CheckoutRequestInput = z.infer<typeof checkoutRequestSchema>;
