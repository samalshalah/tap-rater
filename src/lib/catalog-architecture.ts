import type { MigratedProduct, ProductAssetSet, ProductKind, ProductStatus } from "@/data/migrated-products";

export type StandType = {
  id?: string;
  slug: StandTypeSlug;
  title: string;
  description: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
};

export type BusinessUse = {
  id?: string;
  slug: BusinessUseSlug;
  title: string;
  description: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
};

export type PlatformDestination = {
  id?: string;
  slug: string;
  title: string;
  destinationType: PlatformDestinationType;
  iconUrl?: string;
  googlePlacesEnabled: boolean;
  manualUrlAllowed: boolean;
  isActive: boolean;
};

export type ProductOptionCode = "standard_direct" | "branded_qr_direct" | "hosted_multilink";

export type ProductOption = {
  id?: string;
  productSlug?: string;
  optionCode: ProductOptionCode;
  title: string;
  description: string;
  priceCents: number;
  monthlyPriceCents?: number;
  maxLinks?: number;
  requiresDestinationUrl: boolean;
  hasQr: boolean;
  requiresLogo: boolean;
  requiresBusinessName: boolean;
  requiresDesignStep: boolean;
  requiresFrontProof: boolean;
  requiresSubscription: boolean;
  accountRequired: boolean;
  supportsReorderableLinks: boolean;
  supportsLinkVisibility: boolean;
  landingPageUrlPattern?: string;
  footerLabel?: string;
  isActive: boolean;
  sortOrder: number;
};

export type ProductOrganization = {
  standTypeSlug?: StandTypeSlug;
  primaryPlatformSlug?: string;
  destinationType?: string;
  businessUseSlugs: BusinessUseSlug[];
  isSpecialSolution: boolean;
  productKind: ProductKind;
  status: ProductStatus;
};

export type ProductAssetReadiness =
  | {
      status: "ready";
      missing: [];
    }
  | {
      status: "draft_missing_assets" | "blocked";
      missing: string[];
    };

export type StandTypeSlug =
  | "review-stands"
  | "social-media-stands"
  | "appointment-reservation-stands"
  | "feedback-survey-stands"
  | "menu-info-stands"
  | "website-link-stands"
  | "payment-tip-donation-stands"
  | "loyalty-rewards-stands"
  | "custom-stands";

export type BusinessUseSlug =
  | "automotive"
  | "restaurant-food"
  | "hotel-travel"
  | "healthcare-dental"
  | "home-services"
  | "legal"
  | "real-estate"
  | "beauty-salon-wellness"
  | "ecommerce-online-brand"
  | "retail-local-business";

export type PlatformDestinationType =
  | "review"
  | "review_social"
  | "booking"
  | "menu"
  | "menu_order"
  | "order"
  | "reservation"
  | "website"
  | "social"
  | "payment"
  | "loyalty"
  | "custom";

export const lockedStandTypes: StandType[] = [
  {
    slug: "review-stands",
    title: "Review Stands",
    description: "Stands that send customers to a review destination.",
    imageUrl: "/uploads/products/google-review-stand.png",
    sortOrder: 10,
    isActive: true
  },
  {
    slug: "social-media-stands",
    title: "Social Media Stands",
    description: "Stands that open social profiles or follow links.",
    imageUrl: "/uploads/products/social-media-stand.png",
    sortOrder: 20,
    isActive: true
  },
  {
    slug: "appointment-reservation-stands",
    title: "Appointment & Reservation Stands",
    description: "Stands that open booking, scheduling, reservation, or service links.",
    imageUrl: "/uploads/products/book-next-visit-stand.png",
    sortOrder: 30,
    isActive: true
  },
  {
    slug: "feedback-survey-stands",
    title: "Feedback & Survey Stands",
    description: "Stands that collect private feedback or survey responses.",
    imageUrl: "/uploads/products/rate-your-experience-stand.png",
    sortOrder: 40,
    isActive: true
  },
  {
    slug: "menu-info-stands",
    title: "Menu & Info Stands",
    description: "Stands that open menus, services, pricing, or information pages.",
    imageUrl: "/uploads/products/view-menu-stand.png",
    sortOrder: 50,
    isActive: true
  },
  {
    slug: "website-link-stands",
    title: "Website & Link Stands",
    description: "Stands that open websites, catalogs, apps, locations, or custom direct URLs.",
    imageUrl: "/uploads/products/no-photo-available.png",
    sortOrder: 60,
    isActive: true
  },
  {
    slug: "payment-tip-donation-stands",
    title: "Payment, Tip & Donation Stands",
    description: "Stands that open payment, tip, donation, or support links.",
    imageUrl: "/uploads/products/no-photo-available.png",
    sortOrder: 70,
    isActive: true
  },
  {
    slug: "loyalty-rewards-stands",
    title: "Loyalty & Rewards Stands",
    description: "Stands that open loyalty, rewards, signup, or membership destinations.",
    imageUrl: "/uploads/products/no-photo-available.png",
    sortOrder: 80,
    isActive: true
  },
  {
    slug: "custom-stands",
    title: "Custom Stands",
    description: "Custom Tap Rater stand products and special printed solutions.",
    imageUrl: "/uploads/products/business-google-white-stands-bundle.jpg",
    sortOrder: 90,
    isActive: true
  }
];

export const lockedBusinessUses: BusinessUse[] = [
  {
    slug: "automotive",
    title: "Automotive",
    description: "Dealership, service, repair, and automotive customer actions.",
    imageUrl: "/uploads/use-cases/auto-dealerships.webp",
    sortOrder: 10,
    isActive: true
  },
  {
    slug: "restaurant-food",
    title: "Restaurant / Food",
    description: "Restaurants, cafes, food trucks, delivery, menus, reservations, and feedback.",
    imageUrl: "/uploads/use-cases/restaurants-cafes.webp",
    sortOrder: 20,
    isActive: true
  },
  {
    slug: "hotel-travel",
    title: "Hotel / Travel",
    description: "Hotels, hospitality, travel, guest information, and travel reviews.",
    imageUrl: "/uploads/use-cases/hotels-hospitality.webp",
    sortOrder: 30,
    isActive: true
  },
  {
    slug: "healthcare-dental",
    title: "Healthcare / Dental",
    description: "Medical, dental, patient appointment, review, and feedback use cases.",
    imageUrl: "/uploads/use-cases/healthcare-dental.webp",
    sortOrder: 40,
    isActive: true
  },
  {
    slug: "home-services",
    title: "Home Services",
    description: "Contractor, service appointment, quote, and review use cases.",
    imageUrl: "/uploads/use-cases/home-services.webp",
    sortOrder: 50,
    isActive: true
  },
  {
    slug: "legal",
    title: "Legal",
    description: "Law firm consultation, contact, review, and website use cases.",
    imageUrl: "/uploads/use-cases/legal-services.webp",
    sortOrder: 60,
    isActive: true
  },
  {
    slug: "real-estate",
    title: "Real Estate",
    description: "Listings, open houses, tours, contact, and review use cases.",
    imageUrl: "/uploads/use-cases/real-estate.webp",
    sortOrder: 70,
    isActive: true
  },
  {
    slug: "beauty-salon-wellness",
    title: "Beauty / Salon / Wellness",
    description: "Salon, spa, wellness booking, service, review, and social use cases.",
    imageUrl: "/uploads/use-cases/beauty-wellness.webp",
    sortOrder: 80,
    isActive: true
  },
  {
    slug: "ecommerce-online-brand",
    title: "Ecommerce / Online Brand",
    description: "Online store, catalog, review, promotion, and app use cases.",
    imageUrl: "/uploads/use-cases/ecommerce-brands.webp",
    sortOrder: 90,
    isActive: true
  },
  {
    slug: "retail-local-business",
    title: "Retail / Local Business",
    description: "Local retail, grocery, website, offer, review, and social use cases.",
    imageUrl: "/uploads/use-cases/retail-grocery.webp",
    sortOrder: 100,
    isActive: true
  }
];

export const lockedPlatforms: PlatformDestination[] = [
  platform("google", "Google", "review", { googlePlacesEnabled: true }),
  platform("yelp", "Yelp", "review"),
  platform("facebook", "Facebook", "review_social"),
  platform("tripadvisor", "Tripadvisor", "review"),
  platform("trustpilot", "Trustpilot", "review"),
  platform("bbb", "BBB", "review"),
  platform("nextdoor", "Nextdoor", "review"),
  platform("vagaro", "Vagaro", "booking"),
  platform("booksy", "Booksy", "booking"),
  platform("fresha", "Fresha", "booking"),
  platform("zocdoc", "Zocdoc", "booking"),
  platform("calendly", "Calendly", "booking"),
  platform("acuity", "Acuity Scheduling", "booking"),
  platform("square-appointments", "Square Appointments", "booking"),
  platform("custom-booking-url", "Custom Booking URL", "booking"),
  platform("toast", "Toast", "menu_order"),
  platform("doordash", "DoorDash", "order"),
  platform("ubereats", "Uber Eats", "order"),
  platform("grubhub", "Grubhub", "order"),
  platform("opentable", "OpenTable", "reservation"),
  platform("resy", "Resy", "reservation"),
  platform("custom-menu-url", "Custom Menu URL", "menu"),
  platform("website", "Website", "website"),
  platform("instagram", "Instagram", "social"),
  platform("linkedin", "LinkedIn", "social"),
  platform("x", "X", "social"),
  platform("youtube", "YouTube", "social"),
  platform("payment-url", "Payment URL", "payment"),
  platform("loyalty-url", "Loyalty URL", "loyalty"),
  platform("custom-url", "Custom URL", "custom")
];

export const standardDirectProductOption: ProductOption = {
  optionCode: "standard_direct",
  title: "Standard Direct",
  description: "Ready-made direct stand with NFC only and one required destination link.",
  priceCents: 3900,
  requiresDestinationUrl: true,
  hasQr: false,
  requiresLogo: false,
  requiresBusinessName: false,
  requiresDesignStep: false,
  requiresFrontProof: false,
  requiresSubscription: false,
  accountRequired: false,
  supportsReorderableLinks: false,
  supportsLinkVisibility: false,
  isActive: true,
  sortOrder: 10
};

export const brandedQrDirectProductOption: ProductOption = {
  optionCode: "branded_qr_direct",
  title: "Branded + QR Direct",
  description: "Branded direct stand with NFC, printed QR, business name, logo collection, and front proof.",
  priceCents: 4900,
  requiresDestinationUrl: true,
  hasQr: true,
  requiresLogo: true,
  requiresBusinessName: true,
  requiresDesignStep: true,
  requiresFrontProof: true,
  requiresSubscription: false,
  accountRequired: false,
  supportsReorderableLinks: false,
  supportsLinkVisibility: false,
  isActive: true,
  sortOrder: 20
};

export const hostedMultiLinkProductOption: ProductOption = {
  optionCode: "hosted_multilink",
  title: "Hosted Multi-Link",
  description: "Branded NFC and QR stand connected to a hosted Tap Rater multi-link landing page.",
  priceCents: 4900,
  monthlyPriceCents: 990,
  maxLinks: 10,
  requiresDestinationUrl: false,
  hasQr: true,
  requiresLogo: true,
  requiresBusinessName: true,
  requiresDesignStep: true,
  requiresFrontProof: true,
  requiresSubscription: true,
  accountRequired: true,
  supportsReorderableLinks: true,
  supportsLinkVisibility: true,
  landingPageUrlPattern: "/l/:client-name",
  footerLabel: "Powered by Tap Rater",
  isActive: true,
  sortOrder: 30
};

export const lockedNormalDirectProductOptions = [standardDirectProductOption, brandedQrDirectProductOption];
export const lockedProductOptionTemplates = [
  standardDirectProductOption,
  brandedQrDirectProductOption,
  hostedMultiLinkProductOption
];

export function getDefaultOptionsForProductKind(productKind: ProductKind): ProductOption[] {
  if (productKind === "hosted_multilink") {
    return [hostedMultiLinkProductOption];
  }

  if (productKind === "custom_direct") {
    return [brandedQrDirectProductOption];
  }

  if (productKind === "bundle") {
    return [];
  }

  return [standardDirectProductOption, brandedQrDirectProductOption];
}

export function getProductOrganization(product: MigratedProduct): ProductOrganization {
  return {
    standTypeSlug: product.standTypeSlug as StandTypeSlug | undefined,
    primaryPlatformSlug: product.primaryPlatformSlug,
    destinationType: product.destinationType,
    businessUseSlugs: [],
    isSpecialSolution: product.isSpecialSolution ?? product.productKind === "hosted_multilink",
    productKind: product.productKind ?? inferProductKind(product),
    status: product.status ?? (product.isActive ? "active" : "draft")
  };
}

export function getProductAssetReadiness(product: {
  productKind?: ProductKind;
  isSpecialSolution?: boolean;
  assetSet?: ProductAssetSet;
  images?: { src?: string }[];
}, activeOptions: ProductOption[] = []): ProductAssetReadiness {
  const assetSet = product.assetSet ?? {};
  const standardAngledImageUrl = assetSet.standardAngledImageUrl ?? product.images?.[0]?.src;
  const missing: string[] = [];
  const isHosted = product.productKind === "hosted_multilink" || product.isSpecialSolution;
  const enabledOptionCodes = new Set(activeOptions.filter((option) => option.isActive).map((option) => option.optionCode));

  if (isHosted) {
    if (!(assetSet.multiLinkAngledImageUrl ?? assetSet.brandedAngledImageUrl)) missing.push("Multi-Link angled image");
    if (!(assetSet.multiLinkFrontTemplateUrl ?? assetSet.brandedFrontTemplateUrl)) missing.push("Multi-Link front template");
    if (!assetSet.landingPagePreviewConfig || Object.keys(assetSet.landingPagePreviewConfig).length === 0) {
      missing.push("Landing page preview configuration");
    }
    if (!enabledOptionCodes.has("hosted_multilink")) {
      missing.push("Hosted Multi-Link option");
    }
  } else {
    if (enabledOptionCodes.size === 0) {
      missing.push("At least one active product option");
    }
    if (enabledOptionCodes.has("standard_direct") && !standardAngledImageUrl) {
      missing.push("Standard Direct angled image");
    }
    if (enabledOptionCodes.has("branded_qr_direct")) {
      if (!assetSet.brandedAngledImageUrl) missing.push("Branded + QR angled image");
      if (!assetSet.brandedFrontTemplateUrl) missing.push("Branded + QR front template");
    }
    if (enabledOptionCodes.has("hosted_multilink")) {
      if (!assetSet.multiLinkAngledImageUrl) missing.push("Multi-Link angled image");
      if (!assetSet.multiLinkFrontTemplateUrl) missing.push("Multi-Link front template");
      if (!assetSet.landingPagePreviewConfig || Object.keys(assetSet.landingPagePreviewConfig).length === 0) {
        missing.push("Landing page preview configuration");
      }
    }
  }

  return missing.length === 0 ? { status: "ready", missing: [] } : { status: "draft_missing_assets", missing };
}

export function inferProductKind(product: Pick<MigratedProduct, "slug" | "categorySlug" | "checkoutMode" | "requiresSubscription">): ProductKind {
  if (product.slug.includes("hosted") || product.requiresSubscription || product.checkoutMode === "subscription") {
    return "hosted_multilink";
  }

  if (product.slug === "custom-direct-stand" || product.categorySlug === "custom-stands") {
    return "custom_direct";
  }

  return "normal_direct";
}

function platform(
  slug: string,
  title: string,
  destinationType: PlatformDestinationType,
  options: { iconUrl?: string; googlePlacesEnabled?: boolean; manualUrlAllowed?: boolean } = {}
): PlatformDestination {
  return {
    slug,
    title,
    destinationType,
    iconUrl: options.iconUrl,
    googlePlacesEnabled: options.googlePlacesEnabled ?? false,
    manualUrlAllowed: options.manualUrlAllowed ?? true,
    isActive: true
  };
}
