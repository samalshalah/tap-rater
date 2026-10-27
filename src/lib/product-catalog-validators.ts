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

export const adminProductStatusUpdateSchema = z.object({
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  status: z.enum(productStatuses)
});

export type ProductContentInput = z.infer<typeof productContentSchema>;

export type AdminProductStatusUpdateInput = z.infer<typeof adminProductStatusUpdateSchema>;
