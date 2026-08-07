import { z } from "zod";

const productCustomizationOptions = ["standard_design", "add_logo", "custom_design"] as const;
const productStockStatuses = ["instock", "outofstock"] as const;

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
  basePriceCents: z.number().int().min(0),
  salePriceCents: z.number().int().min(0).optional(),
  stockStatus: z.enum(productStockStatuses),
  shortDescription: z.string().trim().min(5).max(500),
  description: z.string().trim().min(10).max(4000),
  productType: z.enum(["physical_redirect", "physical_managed", "platform_landing_page", "bundle"]).default("physical_redirect"),
  serviceMode: z.enum(["basic_redirect", "managed_redirect", "hosted_landing_page", "multi_location_platform"]).default("basic_redirect"),
  checkoutMode: z.enum(["buy_now", "request_quote", "subscription", "contact_sales"]).default("buy_now"),
  requiresAccount: z.boolean().default(false),
  requiresSubscription: z.boolean().default(false),
  requiresLandingPage: z.boolean().default(false),
  supportedDestinations: z
    .array(
      z.enum([
        "google",
        "facebook",
        "yelp",
        "tripadvisor",
        "instagram",
        "tiktok",
        "booking",
        "website",
        "menu",
        "wifi",
        "feedback",
        "referral",
        "custom"
      ])
    )
    .min(1)
    .default(["custom"]),
  activationType: z.enum(["free_basic_activation", "managed_setup", "premium_hosted_activation"]).default("free_basic_activation"),
  includedServiceLabel: z.string().trim().min(2).max(120).default("Free basic activation"),
  customizationOptions: z.array(z.enum(productCustomizationOptions)).min(1).default(["standard_design"]),
  allowsLogoUpload: z.boolean().default(false),
  allowsCustomDesign: z.boolean().default(false),
  designMode: z.enum(["standard", "logo", "custom"]).default("standard"),
  featured: z.boolean().default(false),
  images: z
    .array(
      z.object({
        src: z.string().trim().min(1).max(500),
        alt: z.string().trim().max(180).default("")
      })
    )
    .max(8)
    .default([]),
  variants: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        label: z.string().trim().min(1).max(120),
        sku: z.string().trim().min(1).max(80),
        stockStatus: z.enum(productStockStatuses),
        imageSrc: z.string().trim().max(500).optional()
      })
    )
    .max(12)
    .default([]),
  seoTitle: z.string().trim().max(180).optional(),
  seoDescription: z.string().trim().max(320).optional(),
  isActive: z.boolean(),
  designLogic: z
    .enum(["standard_platform_locked", "branded_platform_template", "text_action_locked", "text_action_branded", "fully_custom_design"])
    .default("standard_platform_locked"),
  pricingTier: z.enum(["standard_direct", "branded_qr_direct", "hosted_multi_link", "custom"]).default("standard_direct"),
  useCaseSlugs: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  platformSlug: z.string().trim().max(80).optional(),
  colorOptions: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
  templateImages: z
    .object({
      standard: z.object({ src: z.string().trim().min(1).max(500), alt: z.string().trim().max(180).default("") }).optional(),
      branded: z.object({ src: z.string().trim().min(1).max(500), alt: z.string().trim().max(180).default("") }).optional(),
      brandedWithQr: z.object({ src: z.string().trim().min(1).max(500), alt: z.string().trim().max(180).default("") }).optional()
    })
    .optional(),
  providerOptions: z
    .array(
      z.object({
        slug: z.string().trim().min(1).max(80),
        label: z.string().trim().min(1).max(120),
        destinationUrlHint: z.string().trim().max(300).optional()
      })
    )
    .max(30)
    .optional()
});

export type HomepageContentInput = z.infer<typeof homepageContentSchema>;
export type PageContentInput = z.infer<typeof pageContentSchema>;
export type ProductContentInput = z.infer<typeof productContentSchema>;

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
  email: z.string().trim().email().max(180)
});

export const accountLoginVerifySchema = z.object({
  token: z.string().trim().min(10).max(1000)
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

export const checkoutCartSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(2).max(160),
        optionId: z.enum(["standard_direct", "branded_qr_direct", "custom_direct"]).optional(),
        quantity: z.number().int().min(1).max(99),
        setup: z
          .object({
            destinationUrl: z.string().trim().max(500).optional(),
            businessName: z.string().trim().max(160).optional(),
            headline: z.string().trim().max(160).optional(),
            cta: z.string().trim().max(160).optional(),
            logoFileName: z.string().trim().max(240).optional(),
            designNotes: z.string().trim().max(1000).optional(),
            manualCollectionAcknowledged: z.boolean().optional(),
            proofApproved: z.boolean().optional()
          })
          .optional()
      })
    )
    .max(50)
});

export type CheckoutCartInput = z.infer<typeof checkoutCartSchema>;
