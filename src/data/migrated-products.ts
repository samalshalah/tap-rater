export type SupportedDestination =
  | "google"
  | "facebook"
  | "yelp"
  | "tripadvisor"
  | "trustpilot"
  | "bbb"
  | "nextdoor"
  | "dealerrater"
  | "autotrader"
  | "carfax"
  | "edmunds"
  | "cars"
  | "cargurus"
  | "repairpal"
  | "surecritic"
  | "instagram"
  | "tiktok"
  | "linkedin"
  | "x"
  | "youtube"
  | "snapchat"
  | "pinterest"
  | "airbnb"
  | "agoda"
  | "vrbo"
  | "hotels"
  | "healthgrades"
  | "vitals"
  | "ratemds"
  | "vagaro"
  | "booksy"
  | "fresha"
  | "zocdoc"
  | "calendly"
  | "acuity"
  | "square-appointments"
  | "custom-booking-url"
  | "booking"
  | "toast"
  | "doordash"
  | "ubereats"
  | "angi"
  | "grubhub"
  | "opentable"
  | "resy"
  | "custom-menu-url"
  | "website"
  | "menu"
  | "wifi"
  | "feedback"
  | "referral"
  | "payment-url"
  | "loyalty-url"
  | "custom-url"
  | "custom";

export type MigratedProduct = {
  slug: string;
  title: string;
  sku: string;
  categorySlug: CatalogCategorySlug;
  standTypeSlug?: string;
  primaryPlatformSlug?: string;
  destinationType?: string;
  businessUseSlugs?: string[];
  isSpecialSolution?: boolean;
  productKind?: ProductKind;
  status?: ProductStatus;
  basePriceCents: number;
  salePriceCents?: number;
  stockStatus: "instock" | "outofstock";
  shortDescription: string;
  description: string;
  productType: ProductCommerceType;
  serviceMode: ProductServiceMode;
  checkoutMode: ProductCheckoutMode;
  requiresAccount: boolean;
  requiresSubscription: boolean;
  requiresLandingPage: boolean;
  supportedDestinations: SupportedDestination[];
  activationType: ProductActivationType;
  includedServiceLabel: string;
  format: ProductFormat;
  customizationOptions: ProductCustomizationOption[];
  allowsLogoUpload: boolean;
  allowsCustomDesign: boolean;
  designMode: ProductDesignMode;
  displayText?: string;
  assetSet?: ProductAssetSet;
  defaultCtaText?: string;
  ctaEditable?: boolean;
  assetReadinessStatus?: ProductAssetReadinessStatus;
  purchaseOptions?: ProductPurchaseOptionSnapshot[];
  images: { src: string; alt: string }[];
  variants: { id: string; label: string; sku: string; stockStatus: "instock" | "outofstock" }[];
  isActive: boolean;
  seoTitle?: string;
  seoDescription?: string;
  searchKeywords?: string[];
  updatedAt?: string;
};

export type ProductPurchaseOptionSnapshot = {
  id?: string;
  productSlug?: string;
  optionCode: "standard_direct" | "branded_qr_direct" | "hosted_multilink";
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
  supportsReorderableLinks?: boolean;
  supportsLinkVisibility?: boolean;
  landingPageUrlPattern?: string;
  footerLabel?: string;
  isActive: boolean;
  sortOrder: number;
};

export type ProductCommerceType = "physical_redirect" | "physical_managed" | "platform_landing_page" | "bundle";

export type ProductServiceMode = "basic_redirect" | "managed_redirect" | "hosted_landing_page" | "multi_location_platform";

export type ProductCheckoutMode = "buy_now" | "request_quote" | "subscription" | "contact_sales";

export type ProductActivationType = "free_basic_activation" | "managed_setup" | "premium_hosted_activation";

export type ProductFormat = "stand" | "plate" | "bundle" | "platform";

export type ProductCustomizationOption = "standard_design" | "add_logo" | "custom_design";

export type ProductDesignMode = "standard" | "logo" | "custom";

export type ProductKind = "normal_direct" | "custom_direct" | "hosted_multilink" | "bundle";

export type ProductStatus = "draft" | "active" | "archived";

export type ProductAssetReadinessStatus = "draft_missing_assets" | "ready" | "blocked";

export type ProductAssetSet = {
  standardAngledImageUrl?: string;
  brandedAngledImageUrl?: string;
  multiLinkAngledImageUrl?: string;
  standardFrontTemplateUrl?: string;
  brandedFrontTemplateUrl?: string;
  multiLinkFrontTemplateUrl?: string;
  centerAssetUrl?: string;
  landingPagePreviewConfig?: Record<string, unknown>;
};

export type CatalogCategorySlug =
  | "reviews"
  | "social-media"
  | "appointments"
  | "menu"
  | "feedback"
  | "website-links"
  | "custom-stands";

export type CatalogCategory = {
  slug: CatalogCategorySlug;
  title: string;
  eyebrow: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  buyerIntent: string;
  aliases?: string[];
  seoCopy: string;
};

export const catalogCategories: CatalogCategory[] = [
  {
    slug: "reviews",
    title: "Review Stands",
    eyebrow: "Reviews",
    description: "NFC and QR tabletop stands that open Google, Yelp, Facebook, TripAdvisor, or other review destinations.",
    seoTitle: "NFC Review Stands | Tap Rater",
    seoDescription: "Shop NFC review stands for Google, Yelp, Facebook, TripAdvisor, and other review destinations.",
    buyerIntent: "For businesses that want customers to tap or scan and open a public review destination.",
    aliases: ["review-stands", "review-plates", "google-review-products", "review-platform-products", "google-review-stands", "review-platform-stands", "google-review-plates"],
    seoCopy:
      "Review stands focus on one clear customer action: tap or scan to open the review destination."
  },
  {
    slug: "social-media",
    title: "Social Media Stands",
    eyebrow: "Social",
    description: "NFC and QR tabletop stands that open social profiles or a social media link.",
    seoTitle: "NFC Social Media Stands | Tap Rater",
    seoDescription: "Shop NFC social media stands that open social profiles or a social media link.",
    buyerIntent: "For businesses that want customers to follow or visit social profiles after an in-person interaction.",
    aliases: ["social-booking-products", "social-booking-stands", "social-booking-plates", "social-follow-products", "social-media-products"],
    seoCopy:
      "Social media products can open a direct social profile or a social media hub for Facebook, X, Instagram, and YouTube."
  },
  {
    slug: "appointments",
    title: "Appointment & Reservation Stands",
    eyebrow: "Booking",
    description: "NFC and QR tabletop stands that open booking pages, reservation forms, calendars, or scheduling URLs.",
    seoTitle: "Appointment and Reservation NFC Stands | Tap Rater",
    seoDescription: "Shop NFC appointment and reservation stands that open booking pages, forms, calendars, or scheduling URLs.",
    buyerIntent: "For salons, clinics, consultants, service businesses, and teams that want customers to book the next visit.",
    aliases: ["appointment-products", "booking-products"],
    seoCopy:
      "Appointment products open one booking, calendar, form, or scheduling URL through a permanent Tap Rater link."
  },
  {
    slug: "menu",
    title: "Menu & Info Stands",
    eyebrow: "Menu",
    description: "NFC and QR tabletop stands that open a restaurant menu, cafe menu, service list, or information page.",
    seoTitle: "NFC Menu and Info Stands | Tap Rater",
    seoDescription: "Shop NFC menu and information stands that open a restaurant menu, cafe menu, service list, or information page.",
    buyerIntent: "For restaurants, cafes, counters, tables, and service businesses that need customers to open a menu.",
    aliases: ["menu-products"],
    seoCopy:
      "Menu products are menu-only customer prompts. They should not be marketed as Wi-Fi products."
  },
  {
    slug: "feedback",
    title: "Feedback Stands",
    eyebrow: "Feedback",
    description: "NFC and QR tabletop stands that open customer feedback or experience forms.",
    seoTitle: "NFC Feedback Stands | Tap Rater",
    seoDescription: "Shop NFC feedback stands that open customer feedback or experience forms.",
    buyerIntent: "For businesses that want customers to tap or scan and share experience feedback.",
    aliases: ["experience-feedback-products", "feedback-referral-products", "feedback-referral-stands", "feedback-stands"],
    seoCopy:
      "Feedback products open customer feedback or experience forms without review-gating language."
  },
  {
    slug: "website-links",
    title: "Website & Link Stands",
    eyebrow: "Links",
    description: "NFC and QR tabletop stands that open a website, landing page, app download, offer, or custom link.",
    seoTitle: "Website and Link NFC Stands | Tap Rater",
    seoDescription: "Shop NFC website and link stands that open a business website, landing page, app download, offer, or custom link.",
    buyerIntent: "For businesses that want customers to open one important link instantly.",
    aliases: ["website-link-stands", "link-stands"],
    seoCopy:
      "Website and link stands are direct-link products for one clear destination."
  },
  {
    slug: "custom-stands",
    title: "Custom Stands",
    eyebrow: "Custom",
    description: "Custom NFC and QR tabletop stands for one direct destination link.",
    seoTitle: "Custom NFC Stands | Tap Rater",
    seoDescription: "Create a custom NFC and QR tabletop stand with your logo, business name, custom headline, and one destination link.",
    buyerIntent: "For businesses that want a branded stand with custom wording or a custom center graphic.",
    aliases: ["custom-nfc-stands", "custom-qr-stands"],
    seoCopy:
      "Custom stands use a locked approved layout so the customer can personalize the stand without breaking the design."
  }
];

const googleStandImage = { src: "/uploads/products/google-review-stand.png", alt: "Tap Rater Google Review Stand" };
const googlePlateImage = { src: "/uploads/products/google-review-plate.png", alt: "Tap Rater Google Review Plate" };
const yelpStandImage = { src: "/uploads/products/yelp-review-stand.png", alt: "Tap Rater Yelp Review Stand" };
const yelpPlateImage = { src: "/uploads/products/yelp-review-plate.png", alt: "Tap Rater Yelp Review Plate" };
const facebookStandImage = { src: "/uploads/products/facebook-review-stand.png", alt: "Tap Rater Facebook Review Stand" };
const facebookPlateImage = { src: "/uploads/products/facebook-review-plate.png", alt: "Tap Rater Facebook Review Plate" };
const tripadvisorStandImage = { src: "/uploads/products/tripadvisor-review-stand.png", alt: "Tap Rater TripAdvisor Review Stand" };
const tripadvisorPlateImage = { src: "/uploads/products/tripadvisor-review-plate.png", alt: "Tap Rater TripAdvisor Review Plate" };
const experienceStandImage = { src: "/uploads/products/rate-your-experience-stand.png", alt: "Tap Rater Rate Your Experience Stand" };
const experiencePlateImage = { src: "/uploads/products/rate-your-experience-plate.png", alt: "Tap Rater Rate Your Experience Plate" };
const socialStandImage = { src: "/uploads/products/social-media-stand.png", alt: "Tap Rater Follow Us on Social Media Stand" };
const socialPlateImage = { src: "/uploads/products/social-media-plate.png", alt: "Tap Rater Follow Us on Social Media Plate" };
const facebookFollowStandImage = { src: "/uploads/products/facebook-follow-stand.png", alt: "Tap Rater Follow Us on Facebook Stand" };
const instagramFollowStandImage = { src: "/uploads/products/instagram-follow-stand.png", alt: "Tap Rater Follow Us on Instagram Stand" };
const tiktokFollowStandImage = { src: "/uploads/products/tiktok-follow-stand.png", alt: "Tap Rater Follow Us on TikTok Stand" };
const youtubeFollowStandImage = { src: "/uploads/products/youtube-follow-stand.png", alt: "Tap Rater Follow Us on YouTube Stand" };
const linkedinFollowStandImage = { src: "/uploads/products/linkedin-follow-stand.png", alt: "Tap Rater Follow Us on LinkedIn Stand" };
const xFollowStandImage = { src: "/uploads/products/x-follow-stand.png", alt: "Tap Rater Follow Us on X Stand" };
const snapchatFollowStandImage = { src: "/uploads/products/snapchat-follow-stand.png", alt: "Tap Rater Follow Us on Snapchat Stand" };
const pinterestFollowStandImage = { src: "/uploads/products/pinterest-follow-stand.png", alt: "Tap Rater Follow Us on Pinterest Stand" };
const ubereatsReviewStandImage = { src: "/uploads/products/ubereats-review-stand.png", alt: "Tap Rater Uber Eats Review Stand" };
const angiReviewStandImage = { src: "/uploads/products/angi-review-stand.png", alt: "Tap Rater Angi Review Stand" };
const dealerraterReviewStandImage = { src: "/uploads/products/dealerrater-review-stand.png", alt: "Tap Rater DealerRater Review Stand" };
const autotraderReviewStandImage = { src: "/uploads/products/autotrader-review-stand.png", alt: "Tap Rater Autotrader Review Stand" };
const carfaxReviewStandImage = { src: "/uploads/products/carfax-review-stand.png", alt: "Tap Rater CARFAX Review Stand" };
const edmundsReviewStandImage = { src: "/uploads/products/edmunds-review-stand.png", alt: "Tap Rater Edmunds Review Stand" };
const carsReviewStandImage = { src: "/uploads/products/cars-review-stand.png", alt: "Tap Rater Cars.com Review Stand" };
const cargurusReviewStandImage = { src: "/uploads/products/cargurus-review-stand.png", alt: "Tap Rater CarGurus Review Stand" };
const repairpalReviewStandImage = { src: "/uploads/products/repairpal-review-stand.png", alt: "Tap Rater RepairPal Review Stand" };
const surecriticReviewStandImage = { src: "/uploads/products/surecritic-review-stand.png", alt: "Tap Rater SureCritic Review Stand" };
const airbnbReviewStandImage = { src: "/uploads/products/airbnb-review-stand.png", alt: "Tap Rater Airbnb Review Stand" };
const agodaReviewStandImage = { src: "/uploads/products/agoda-review-stand.png", alt: "Tap Rater Agoda Review Stand" };
const vrboReviewStandImage = { src: "/uploads/products/vrbo-review-stand.png", alt: "Tap Rater Vrbo Review Stand" };
const hotelsReviewStandImage = { src: "/uploads/products/hotels-review-stand.png", alt: "Tap Rater Hotels.com Review Stand" };
const healthgradesReviewStandImage = { src: "/uploads/products/healthgrades-review-stand.png", alt: "Tap Rater Healthgrades Review Stand" };
const vitalsReviewStandImage = { src: "/uploads/products/vitals-review-stand.png", alt: "Tap Rater Vitals Review Stand" };
const zocdocReviewStandImage = { src: "/uploads/products/zocdoc-review-stand.png", alt: "Tap Rater Zocdoc Review Stand" };
const ratemdsReviewStandImage = { src: "/uploads/products/ratemds-review-stand.png", alt: "Tap Rater RateMDs Review Stand" };
const bookingStandImage = { src: "/uploads/products/book-next-visit-stand.png", alt: "Tap Rater Book Your Next Visit Stand" };
const bookingPlateImage = { src: "/uploads/products/book-next-visit-plate.png", alt: "Tap Rater Book Your Next Visit Plate" };
const menuStandImage = { src: "/uploads/products/view-menu-stand.png", alt: "Tap Rater View Our Menu Stand" };
const menuPlateImage = { src: "/uploads/products/view-menu-plate.png", alt: "Tap Rater View Our Menu Plate" };

const standPriceCents = 3900;
const platePriceCents = 3900;
const defaultPhysicalCustomizationOptions: ProductCustomizationOption[] = ["standard_design", "add_logo"];

const colors = [
  { id: "white", label: "White", suffix: "W" },
  { id: "black", label: "Black", suffix: "B" }
];

type PhaseOneProductInput = {
  slug: string;
  title: string;
  sku: string;
  categorySlug: CatalogCategorySlug;
  standTypeSlug?: string;
  primaryPlatformSlug?: string;
  destinationType?: string;
  businessUseSlugs?: string[];
  basePriceCents: number;
  shortDescription: string;
  description: string;
  supportedDestinations: SupportedDestination[];
  displayText: string;
  image: { src: string; alt: string };
  seoTitle: string;
  seoDescription: string;
  searchKeywords: string[];
};

function phaseOneProduct(input: PhaseOneProductInput): MigratedProduct {
  return {
    slug: input.slug,
    title: input.title,
    sku: input.sku,
    categorySlug: input.categorySlug,
    standTypeSlug: input.standTypeSlug,
    primaryPlatformSlug: input.primaryPlatformSlug,
    destinationType: input.destinationType,
    businessUseSlugs: input.businessUseSlugs,
    basePriceCents: input.basePriceCents,
    stockStatus: "instock",
    shortDescription: input.shortDescription,
    description: `${input.description} Available as a Standard Direct stand or a Branded + QR Direct stand.`,
    productType: "physical_redirect",
    serviceMode: "basic_redirect",
    checkoutMode: "buy_now",
    requiresAccount: false,
    requiresSubscription: false,
    requiresLandingPage: false,
    supportedDestinations: input.supportedDestinations,
    activationType: "free_basic_activation",
    includedServiceLabel: "Free basic activation",
    format: input.title.includes("Plate") ? "plate" : "stand",
    customizationOptions: [...defaultPhysicalCustomizationOptions],
    allowsLogoUpload: true,
    allowsCustomDesign: false,
    designMode: "standard",
    displayText: input.displayText,
    images: [input.image],
    variants: colors.map((color) => ({
      id: color.id,
      label: color.label,
      sku: `${input.sku}-${color.suffix}`,
      stockStatus: "instock"
    })),
    isActive: !input.title.includes("Plate"),
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    searchKeywords: input.searchKeywords
  };
}

export const migratedProducts: MigratedProduct[] = [
  phaseOneProduct({
    slug: "google-review-stand",
    title: "Google Review Stand",
    sku: "TR-GOOGLE-STAND",
    categorySlug: "reviews",
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC stand that opens your Google review link with one tap or scan.",
    description:
      "Google Review Stand is a tabletop NFC display for counters, desks, checkout areas, and reception spaces. It opens your Google review link through free basic activation, connects to one destination URL, and is tap or scan ready.",
    supportedDestinations: ["google"],
    displayText: "Review us on Google",
    image: googleStandImage,
    seoTitle: "Google Review Stand | NFC Review Stand for Local Businesses",
    seoDescription: "Buy a Google Review Stand that opens your Google review link with one tap or scan as a one-time physical product purchase.",
    searchKeywords: ["google review stand", "google nfc stand", "review us on google stand"]
  }),
  phaseOneProduct({
    slug: "google-review-plate",
    title: "Google Review Plate",
    sku: "TR-GOOGLE-PLATE",
    categorySlug: "reviews",
    basePriceCents: platePriceCents,
    shortDescription: "Low-profile NFC plate for counters, desks, tables, and reception areas.",
    description:
      "Google Review Plate is a flat NFC prompt for counters, desks, tables, and reception areas. It opens your Google review link through free basic activation, connects to one destination URL, and is tap or scan ready.",
    supportedDestinations: ["google"],
    displayText: "Review us on Google",
    image: googlePlateImage,
    seoTitle: "Google Review Plate | NFC Review Plate for Counters and Tables",
    seoDescription: "Buy a Google Review Plate for counters, desks, tables, and reception areas. Opens your Google review link with one tap or scan.",
    searchKeywords: ["google review plate", "nfc review plate", "review us on google plate"]
  }),
  phaseOneProduct({
    slug: "yelp-review-stand",
    title: "Yelp Review Stand",
    sku: "TR-YELP-STAND",
    categorySlug: "reviews",
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC stand that opens your Yelp review or business profile destination.",
    description:
      "Yelp Review Stand is a tabletop NFC display for businesses that want customers to open a Yelp review or business profile destination. It connects to one destination URL as a one-time physical product purchase.",
    supportedDestinations: ["yelp"],
    displayText: "Review us on Yelp",
    image: yelpStandImage,
    seoTitle: "Yelp Review Stand | NFC Yelp Review Product",
    seoDescription: "Buy a Yelp Review Stand that opens your Yelp review or business profile destination with one tap or scan.",
    searchKeywords: ["yelp review stand", "yelp nfc stand", "review us on yelp stand"]
  }),
  phaseOneProduct({
    slug: "yelp-review-plate",
    title: "Yelp Review Plate",
    sku: "TR-YELP-PLATE",
    categorySlug: "reviews",
    basePriceCents: platePriceCents,
    shortDescription: "Low-profile NFC plate that helps customers open your Yelp destination.",
    description:
      "Yelp Review Plate is a low-profile NFC prompt that helps customers open your Yelp destination from a counter, table, desk, or reception area. It connects to one destination URL and is tap or scan ready.",
    supportedDestinations: ["yelp"],
    displayText: "Review us on Yelp",
    image: yelpPlateImage,
    seoTitle: "Yelp Review Plate | Low-Profile NFC Yelp Product",
    seoDescription: "Low-profile NFC plate that helps customers open your Yelp destination from counters, desks, tables, or reception areas.",
    searchKeywords: ["yelp review plate", "yelp nfc plate", "review us on yelp plate"]
  }),
  phaseOneProduct({
    slug: "facebook-review-stand",
    title: "Facebook Review Stand",
    sku: "TR-FACEBOOK-STAND",
    categorySlug: "reviews",
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC stand that opens your Facebook review, recommendation, or business profile destination.",
    description:
      "Facebook Review Stand is a tabletop NFC display that opens your Facebook review, recommendation, or business profile destination. It uses free basic activation, connects to one destination URL, and is tap or scan ready.",
    supportedDestinations: ["facebook"],
    displayText: "Review us on Facebook",
    image: facebookStandImage,
    seoTitle: "Facebook Review Stand | NFC Facebook Review Product",
    seoDescription: "Buy a Facebook Review Stand that opens your Facebook review, recommendation, or business profile destination.",
    searchKeywords: ["facebook review stand", "facebook nfc stand", "review us on facebook stand"]
  }),
  phaseOneProduct({
    slug: "facebook-review-plate",
    title: "Facebook Review Plate",
    sku: "TR-FACEBOOK-PLATE",
    categorySlug: "reviews",
    basePriceCents: platePriceCents,
    shortDescription: "Low-profile NFC plate for Facebook reviews, recommendations, or profile visits.",
    description:
      "Facebook Review Plate is a flat NFC product for Facebook reviews, recommendations, or profile visits. It connects to one destination URL as a one-time physical product purchase.",
    supportedDestinations: ["facebook"],
    displayText: "Review us on Facebook",
    image: facebookPlateImage,
    seoTitle: "Facebook Review Plate | Low-Profile NFC Facebook Product",
    seoDescription: "Low-profile NFC plate for Facebook reviews, recommendations, or profile visits.",
    searchKeywords: ["facebook review plate", "facebook nfc plate", "review us on facebook plate"]
  }),
  phaseOneProduct({
    slug: "tripadvisor-review-stand",
    title: "TripAdvisor Review Stand",
    sku: "TR-TRIPADVISOR-STAND",
    categorySlug: "reviews",
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC stand for hotels, restaurants, attractions, and visitor-facing businesses.",
    description:
      "TripAdvisor Review Stand is a tabletop NFC display for hotels, restaurants, attractions, and visitor-facing businesses. It opens your TripAdvisor destination through one configured URL.",
    supportedDestinations: ["tripadvisor"],
    displayText: "Review us on TripAdvisor",
    image: tripadvisorStandImage,
    seoTitle: "TripAdvisor Review Stand | NFC Review Stand for Hospitality",
    seoDescription: "Buy a TripAdvisor Review Stand for hotels, restaurants, attractions, and visitor-facing businesses.",
    searchKeywords: ["tripadvisor review stand", "tripadvisor nfc stand", "review us on tripadvisor stand"]
  }),
  phaseOneProduct({
    slug: "tripadvisor-review-plate",
    title: "TripAdvisor Review Plate",
    sku: "TR-TRIPADVISOR-PLATE",
    categorySlug: "reviews",
    basePriceCents: platePriceCents,
    shortDescription: "Low-profile NFC plate for hospitality, restaurants, tourism, and visitor-facing businesses.",
    description:
      "TripAdvisor Review Plate is a flat NFC product for hospitality, restaurants, tourism, and visitor-facing businesses. It opens your TripAdvisor destination with one tap or scan.",
    supportedDestinations: ["tripadvisor"],
    displayText: "Review us on TripAdvisor",
    image: tripadvisorPlateImage,
    seoTitle: "TripAdvisor Review Plate | Low-Profile NFC Hospitality Product",
    seoDescription: "Low-profile NFC plate for TripAdvisor destinations at hotels, restaurants, attractions, and visitor-facing businesses.",
    searchKeywords: ["tripadvisor review plate", "tripadvisor nfc plate", "review us on tripadvisor plate"]
  }),
  phaseOneProduct({
    slug: "ubereats-review-stand",
    title: "Uber Eats Review Stand",
    sku: "TR-UBEREATS-STAND",
    categorySlug: "reviews",
    standTypeSlug: "review-stands",
    primaryPlatformSlug: "ubereats",
    destinationType: "review",
    businessUseSlugs: ["restaurant-food", "ecommerce-online-brand", "retail-local-business"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your Uber Eats review destination.",
    description:
      "Uber Eats Review Stand is a tabletop NFC and QR display for restaurants, cafes, ghost kitchens, and delivery-focused counters. It connects directly to one Uber Eats review destination URL and is tap or scan ready.",
    supportedDestinations: ["ubereats"],
    displayText: "Review us on Uber Eats",
    image: ubereatsReviewStandImage,
    seoTitle: "Uber Eats Review Stand | NFC and QR Restaurant Review Stand",
    seoDescription: "Buy an Uber Eats Review Stand that opens your Uber Eats review destination with one tap or scan.",
    searchKeywords: ["uber eats review stand", "ubereats nfc stand", "review us on uber eats stand"]
  }),
  phaseOneProduct({
    slug: "angi-review-stand",
    title: "Angi Review Stand",
    sku: "TR-ANGI-STAND",
    categorySlug: "reviews",
    standTypeSlug: "review-stands",
    primaryPlatformSlug: "angi",
    destinationType: "review",
    businessUseSlugs: ["home-services", "real-estate", "legal"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your Angi review destination.",
    description:
      "Angi Review Stand is a tabletop NFC and QR display for home service businesses and local contractors. It connects directly to one Angi review destination URL and is tap or scan ready.",
    supportedDestinations: ["angi"],
    displayText: "Review us on Angi",
    image: angiReviewStandImage,
    seoTitle: "Angi Review Stand | NFC and QR Home Services Review Stand",
    seoDescription: "Buy an Angi Review Stand that opens your Angi review destination with one tap or scan.",
    searchKeywords: ["angi review stand", "angi nfc stand", "review us on angi stand"]
  }),
  phaseOneProduct({
    slug: "dealerrater-review-stand",
    title: "DealerRater Review Stand",
    sku: "TR-DEALERRATER-STAND",
    categorySlug: "reviews",
    standTypeSlug: "review-stands",
    primaryPlatformSlug: "dealerrater",
    destinationType: "review",
    businessUseSlugs: ["automotive"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your DealerRater review destination.",
    description:
      "DealerRater Review Stand is a tabletop NFC and QR display for dealerships and automotive service counters. It connects directly to one DealerRater review destination URL and is tap or scan ready.",
    supportedDestinations: ["dealerrater"],
    displayText: "Review us on DealerRater",
    image: dealerraterReviewStandImage,
    seoTitle: "DealerRater Review Stand | NFC and QR Automotive Review Stand",
    seoDescription: "Buy a DealerRater Review Stand that opens your DealerRater review destination with one tap or scan.",
    searchKeywords: ["dealerrater review stand", "dealerrater nfc stand", "review us on dealerrater stand"]
  }),
  phaseOneProduct({
    slug: "autotrader-review-stand",
    title: "Autotrader Review Stand",
    sku: "TR-AUTOTRADER-STAND",
    categorySlug: "reviews",
    standTypeSlug: "review-stands",
    primaryPlatformSlug: "autotrader",
    destinationType: "review",
    businessUseSlugs: ["automotive"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your Autotrader review destination.",
    description:
      "Autotrader Review Stand is a tabletop NFC and QR display for dealerships and automotive sales counters. It connects directly to one Autotrader review destination URL and is tap or scan ready.",
    supportedDestinations: ["autotrader"],
    displayText: "Review us on Autotrader",
    image: autotraderReviewStandImage,
    seoTitle: "Autotrader Review Stand | NFC and QR Automotive Review Stand",
    seoDescription: "Buy an Autotrader Review Stand that opens your Autotrader review destination with one tap or scan.",
    searchKeywords: ["autotrader review stand", "autotrader nfc stand", "review us on autotrader stand"]
  }),
  phaseOneProduct({
    slug: "carfax-review-stand",
    title: "CARFAX Review Stand",
    sku: "TR-CARFAX-STAND",
    categorySlug: "reviews",
    standTypeSlug: "review-stands",
    primaryPlatformSlug: "carfax",
    destinationType: "review",
    businessUseSlugs: ["automotive"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your CARFAX review destination.",
    description:
      "CARFAX Review Stand is a tabletop NFC and QR display for dealerships and automotive service counters. It connects directly to one CARFAX review destination URL and is tap or scan ready.",
    supportedDestinations: ["carfax"],
    displayText: "Review us on CARFAX",
    image: carfaxReviewStandImage,
    seoTitle: "CARFAX Review Stand | NFC and QR Automotive Review Stand",
    seoDescription: "Buy a CARFAX Review Stand that opens your CARFAX review destination with one tap or scan.",
    searchKeywords: ["carfax review stand", "carfax nfc stand", "review us on carfax stand"]
  }),
  phaseOneProduct({
    slug: "edmunds-review-stand",
    title: "Edmunds Review Stand",
    sku: "TR-EDMUNDS-STAND",
    categorySlug: "reviews",
    standTypeSlug: "review-stands",
    primaryPlatformSlug: "edmunds",
    destinationType: "review",
    businessUseSlugs: ["automotive"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your Edmunds review destination.",
    description:
      "Edmunds Review Stand is a tabletop NFC and QR display for dealerships and automotive sales teams. It connects directly to one Edmunds review destination URL and is tap or scan ready.",
    supportedDestinations: ["edmunds"],
    displayText: "Review us on Edmunds",
    image: edmundsReviewStandImage,
    seoTitle: "Edmunds Review Stand | NFC and QR Automotive Review Stand",
    seoDescription: "Buy an Edmunds Review Stand that opens your Edmunds review destination with one tap or scan.",
    searchKeywords: ["edmunds review stand", "edmunds nfc stand", "review us on edmunds stand"]
  }),
  phaseOneProduct({
    slug: "cars-review-stand",
    title: "Cars.com Review Stand",
    sku: "TR-CARS-STAND",
    categorySlug: "reviews",
    standTypeSlug: "review-stands",
    primaryPlatformSlug: "cars",
    destinationType: "review",
    businessUseSlugs: ["automotive"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your Cars.com review destination.",
    description:
      "Cars.com Review Stand is a tabletop NFC and QR display for dealerships and automotive retail counters. It connects directly to one Cars.com review destination URL and is tap or scan ready.",
    supportedDestinations: ["cars"],
    displayText: "Review us on Cars.com",
    image: carsReviewStandImage,
    seoTitle: "Cars.com Review Stand | NFC and QR Automotive Review Stand",
    seoDescription: "Buy a Cars.com Review Stand that opens your Cars.com review destination with one tap or scan.",
    searchKeywords: ["cars.com review stand", "cars nfc stand", "review us on cars.com stand"]
  }),
  phaseOneProduct({
    slug: "cargurus-review-stand",
    title: "CarGurus Review Stand",
    sku: "TR-CARGURUS-STAND",
    categorySlug: "reviews",
    standTypeSlug: "review-stands",
    primaryPlatformSlug: "cargurus",
    destinationType: "review",
    businessUseSlugs: ["automotive"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your CarGurus review destination.",
    description:
      "CarGurus Review Stand is a tabletop NFC and QR display for dealerships and automotive sales counters. It connects directly to one CarGurus review destination URL and is tap or scan ready.",
    supportedDestinations: ["cargurus"],
    displayText: "Review us on CarGurus",
    image: cargurusReviewStandImage,
    seoTitle: "CarGurus Review Stand | NFC and QR Automotive Review Stand",
    seoDescription: "Buy a CarGurus Review Stand that opens your CarGurus review destination with one tap or scan.",
    searchKeywords: ["cargurus review stand", "cargurus nfc stand", "review us on cargurus stand"]
  }),
  phaseOneProduct({
    slug: "repairpal-review-stand",
    title: "RepairPal Review Stand",
    sku: "TR-REPAIRPAL-STAND",
    categorySlug: "reviews",
    standTypeSlug: "review-stands",
    primaryPlatformSlug: "repairpal",
    destinationType: "review",
    businessUseSlugs: ["automotive", "home-services"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your RepairPal review destination.",
    description:
      "RepairPal Review Stand is a tabletop NFC and QR display for automotive repair and service counters. It connects directly to one RepairPal review destination URL and is tap or scan ready.",
    supportedDestinations: ["repairpal"],
    displayText: "Review us on RepairPal",
    image: repairpalReviewStandImage,
    seoTitle: "RepairPal Review Stand | NFC and QR Auto Repair Review Stand",
    seoDescription: "Buy a RepairPal Review Stand that opens your RepairPal review destination with one tap or scan.",
    searchKeywords: ["repairpal review stand", "repairpal nfc stand", "review us on repairpal stand"]
  }),
  phaseOneProduct({
    slug: "surecritic-review-stand",
    title: "SureCritic Review Stand",
    sku: "TR-SURECRITIC-STAND",
    categorySlug: "reviews",
    standTypeSlug: "review-stands",
    primaryPlatformSlug: "surecritic",
    destinationType: "review",
    businessUseSlugs: ["automotive", "home-services"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your SureCritic review destination.",
    description:
      "SureCritic Review Stand is a tabletop NFC and QR display for automotive, service, and local business review collection. It connects directly to one SureCritic review destination URL and is tap or scan ready.",
    supportedDestinations: ["surecritic"],
    displayText: "Review us on SureCritic",
    image: surecriticReviewStandImage,
    seoTitle: "SureCritic Review Stand | NFC and QR Review Stand",
    seoDescription: "Buy a SureCritic Review Stand that opens your SureCritic review destination with one tap or scan.",
    searchKeywords: ["surecritic review stand", "surecritic nfc stand", "review us on surecritic stand"]
  }),
  phaseOneProduct({
    slug: "airbnb-review-stand",
    title: "Airbnb Review Stand",
    sku: "TR-AIRBNB-STAND",
    categorySlug: "reviews",
    standTypeSlug: "review-stands",
    primaryPlatformSlug: "airbnb",
    destinationType: "review",
    businessUseSlugs: ["hotel-travel", "real-estate"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your Airbnb review destination.",
    description:
      "Airbnb Review Stand is a tabletop NFC and QR display for short-term rentals, hosts, and guest checkout points. It connects directly to one Airbnb review destination URL and is tap or scan ready.",
    supportedDestinations: ["airbnb"],
    displayText: "Review us on Airbnb",
    image: airbnbReviewStandImage,
    seoTitle: "Airbnb Review Stand | NFC and QR Hospitality Review Stand",
    seoDescription: "Buy an Airbnb Review Stand that opens your Airbnb review destination with one tap or scan.",
    searchKeywords: ["airbnb review stand", "airbnb nfc stand", "review us on airbnb stand"]
  }),
  phaseOneProduct({
    slug: "agoda-review-stand",
    title: "Agoda Review Stand",
    sku: "TR-AGODA-STAND",
    categorySlug: "reviews",
    standTypeSlug: "review-stands",
    primaryPlatformSlug: "agoda",
    destinationType: "review",
    businessUseSlugs: ["hotel-travel"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your Agoda review destination.",
    description:
      "Agoda Review Stand is a tabletop NFC and QR display for hotels, guest stays, and travel hospitality counters. It connects directly to one Agoda review destination URL and is tap or scan ready.",
    supportedDestinations: ["agoda"],
    displayText: "Review us on Agoda",
    image: agodaReviewStandImage,
    seoTitle: "Agoda Review Stand | NFC and QR Hotel Review Stand",
    seoDescription: "Buy an Agoda Review Stand that opens your Agoda review destination with one tap or scan.",
    searchKeywords: ["agoda review stand", "agoda nfc stand", "review us on agoda stand"]
  }),
  phaseOneProduct({
    slug: "vrbo-review-stand",
    title: "Vrbo Review Stand",
    sku: "TR-VRBO-STAND",
    categorySlug: "reviews",
    standTypeSlug: "review-stands",
    primaryPlatformSlug: "vrbo",
    destinationType: "review",
    businessUseSlugs: ["hotel-travel", "real-estate"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your Vrbo review destination.",
    description:
      "Vrbo Review Stand is a tabletop NFC and QR display for vacation rentals, hosts, and guest checkout points. It connects directly to one Vrbo review destination URL and is tap or scan ready.",
    supportedDestinations: ["vrbo"],
    displayText: "Review us on Vrbo",
    image: vrboReviewStandImage,
    seoTitle: "Vrbo Review Stand | NFC and QR Vacation Rental Review Stand",
    seoDescription: "Buy a Vrbo Review Stand that opens your Vrbo review destination with one tap or scan.",
    searchKeywords: ["vrbo review stand", "vrbo nfc stand", "review us on vrbo stand"]
  }),
  phaseOneProduct({
    slug: "hotels-review-stand",
    title: "Hotels.com Review Stand",
    sku: "TR-HOTELS-STAND",
    categorySlug: "reviews",
    standTypeSlug: "review-stands",
    primaryPlatformSlug: "hotels",
    destinationType: "review",
    businessUseSlugs: ["hotel-travel"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your Hotels.com review destination.",
    description:
      "Hotels.com Review Stand is a tabletop NFC and QR display for hotels, hospitality desks, and guest checkout counters. It connects directly to one Hotels.com review destination URL and is tap or scan ready.",
    supportedDestinations: ["hotels"],
    displayText: "Review us on Hotels.com",
    image: hotelsReviewStandImage,
    seoTitle: "Hotels.com Review Stand | NFC and QR Hotel Review Stand",
    seoDescription: "Buy a Hotels.com Review Stand that opens your Hotels.com review destination with one tap or scan.",
    searchKeywords: ["hotels.com review stand", "hotels nfc stand", "review us on hotels.com stand"]
  }),
  phaseOneProduct({
    slug: "healthgrades-review-stand",
    title: "Healthgrades Review Stand",
    sku: "TR-HEALTHGRADES-STAND",
    categorySlug: "reviews",
    standTypeSlug: "review-stands",
    primaryPlatformSlug: "healthgrades",
    destinationType: "review",
    businessUseSlugs: ["healthcare-dental"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your Healthgrades review destination.",
    description:
      "Healthgrades Review Stand is a tabletop NFC and QR display for healthcare, dental, and patient-facing reception counters. It connects directly to one Healthgrades review destination URL and is tap or scan ready.",
    supportedDestinations: ["healthgrades"],
    displayText: "Review us on Healthgrades",
    image: healthgradesReviewStandImage,
    seoTitle: "Healthgrades Review Stand | NFC and QR Healthcare Review Stand",
    seoDescription: "Buy a Healthgrades Review Stand that opens your Healthgrades review destination with one tap or scan.",
    searchKeywords: ["healthgrades review stand", "healthgrades nfc stand", "review us on healthgrades stand"]
  }),
  phaseOneProduct({
    slug: "vitals-review-stand",
    title: "Vitals Review Stand",
    sku: "TR-VITALS-STAND",
    categorySlug: "reviews",
    standTypeSlug: "review-stands",
    primaryPlatformSlug: "vitals",
    destinationType: "review",
    businessUseSlugs: ["healthcare-dental"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your Vitals review destination.",
    description:
      "Vitals Review Stand is a tabletop NFC and QR display for healthcare, dental, and patient-facing reception counters. It connects directly to one Vitals review destination URL and is tap or scan ready.",
    supportedDestinations: ["vitals"],
    displayText: "Review us on Vitals",
    image: vitalsReviewStandImage,
    seoTitle: "Vitals Review Stand | NFC and QR Healthcare Review Stand",
    seoDescription: "Buy a Vitals Review Stand that opens your Vitals review destination with one tap or scan.",
    searchKeywords: ["vitals review stand", "vitals nfc stand", "review us on vitals stand"]
  }),
  phaseOneProduct({
    slug: "zocdoc-review-stand",
    title: "Zocdoc Review Stand",
    sku: "TR-ZOCDOC-REVIEW-STAND",
    categorySlug: "reviews",
    standTypeSlug: "review-stands",
    primaryPlatformSlug: "zocdoc",
    destinationType: "review",
    businessUseSlugs: ["healthcare-dental"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your Zocdoc review destination.",
    description:
      "Zocdoc Review Stand is a tabletop NFC and QR display for healthcare, dental, and patient-facing reception counters. It connects directly to one Zocdoc review destination URL and is tap or scan ready.",
    supportedDestinations: ["zocdoc"],
    displayText: "Review us on Zocdoc",
    image: zocdocReviewStandImage,
    seoTitle: "Zocdoc Review Stand | NFC and QR Healthcare Review Stand",
    seoDescription: "Buy a Zocdoc Review Stand that opens your Zocdoc review destination with one tap or scan.",
    searchKeywords: ["zocdoc review stand", "zocdoc nfc stand", "review us on zocdoc stand"]
  }),
  phaseOneProduct({
    slug: "ratemds-review-stand",
    title: "RateMDs Review Stand",
    sku: "TR-RATEMDS-STAND",
    categorySlug: "reviews",
    standTypeSlug: "review-stands",
    primaryPlatformSlug: "ratemds",
    destinationType: "review",
    businessUseSlugs: ["healthcare-dental"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your RateMDs review destination.",
    description:
      "RateMDs Review Stand is a tabletop NFC and QR display for healthcare, dental, and patient-facing reception counters. It connects directly to one RateMDs review destination URL and is tap or scan ready.",
    supportedDestinations: ["ratemds"],
    displayText: "Review us on RateMDs",
    image: ratemdsReviewStandImage,
    seoTitle: "RateMDs Review Stand | NFC and QR Healthcare Review Stand",
    seoDescription: "Buy a RateMDs Review Stand that opens your RateMDs review destination with one tap or scan.",
    searchKeywords: ["ratemds review stand", "ratemds nfc stand", "review us on ratemds stand"]
  }),
  phaseOneProduct({
    slug: "rate-your-experience-stand",
    title: "Rate Your Experience Stand",
    sku: "TR-EXPERIENCE-STAND",
    categorySlug: "feedback",
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC stand for collecting customer experience feedback through a Tap Rater destination.",
    description:
      "Rate Your Experience Stand is a tabletop NFC display for customer experience feedback through a Tap Rater destination. It connects to one destination URL and can support a direct feedback or follow-up flow.",
    supportedDestinations: ["feedback", "custom"],
    displayText: "Rate Your Experience",
    image: experienceStandImage,
    seoTitle: "Rate Your Experience Stand | NFC Feedback Stand",
    seoDescription: "Countertop NFC stand for collecting customer experience feedback through a Tap Rater destination.",
    searchKeywords: ["rate your experience stand", "feedback nfc stand", "customer experience stand"]
  }),
  phaseOneProduct({
    slug: "rate-your-experience-plate",
    title: "Rate Your Experience Plate",
    sku: "TR-EXPERIENCE-PLATE",
    categorySlug: "feedback",
    basePriceCents: platePriceCents,
    shortDescription: "Low-profile NFC plate for customer experience feedback and follow-up flows.",
    description:
      "Rate Your Experience Plate is a low-profile NFC product for customer experience feedback and follow-up flows. It opens one Tap Rater destination URL and is tap or scan ready.",
    supportedDestinations: ["feedback", "custom"],
    displayText: "Rate Your Experience",
    image: experiencePlateImage,
    seoTitle: "Rate Your Experience Plate | Low-Profile NFC Feedback Product",
    seoDescription: "Low-profile NFC plate for customer experience feedback and follow-up flows.",
    searchKeywords: ["rate your experience plate", "feedback nfc plate", "customer experience plate"]
  }),
  phaseOneProduct({
    slug: "follow-us-social-media-stand",
    title: "Follow Us on Social Media Stand",
    sku: "TR-SOCIAL-STAND",
    categorySlug: "social-media",
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC stand that opens a social media hub or direct social profile.",
    description:
      "Follow Us on Social Media Stand is a tabletop NFC display that opens a social media hub or direct social profile. It is designed for Facebook, X, Instagram, and YouTube destinations through one configured URL.",
    supportedDestinations: ["facebook", "instagram", "website", "custom"],
    displayText: "Follow Us on Social Media",
    image: socialStandImage,
    seoTitle: "Follow Us on Social Media Stand | NFC Social Follow Stand",
    seoDescription: "Countertop NFC stand that opens a social media hub or direct profile for Facebook, X, Instagram, and YouTube.",
    searchKeywords: ["social media nfc stand", "follow us social media stand", "instagram facebook youtube nfc stand"]
  }),
  phaseOneProduct({
    slug: "follow-us-social-media-plate",
    title: "Follow Us on Social Media Plate",
    sku: "TR-SOCIAL-PLATE",
    categorySlug: "social-media",
    basePriceCents: platePriceCents,
    shortDescription: "Low-profile NFC plate that opens a social media hub or direct social profile.",
    description:
      "Follow Us on Social Media Plate is a flat NFC prompt that opens a social media hub or direct profile. It supports Facebook, X, Instagram, and YouTube through one configured URL.",
    supportedDestinations: ["facebook", "instagram", "website", "custom"],
    displayText: "Follow Us on Social Media",
    image: socialPlateImage,
    seoTitle: "Follow Us on Social Media Plate | NFC Social Follow Plate",
    seoDescription: "Low-profile NFC plate that opens a social media hub or direct social profile for Facebook, X, Instagram, and YouTube.",
    searchKeywords: ["social media nfc plate", "follow us social media plate", "social follow plate"]
  }),
  phaseOneProduct({
    slug: "facebook-follow-stand",
    title: "Facebook Follow Stand",
    sku: "TR-FACEBOOK-FOLLOW-STAND",
    categorySlug: "social-media",
    standTypeSlug: "social-media-stands",
    primaryPlatformSlug: "facebook",
    destinationType: "social",
    businessUseSlugs: ["restaurant-food", "retail-local-business", "automotive", "real-estate", "beauty-salon-wellness"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your Facebook page or profile.",
    description:
      "Facebook Follow Stand is a tabletop NFC and QR display for sending customers directly to your Facebook page or profile. It connects directly to one Facebook destination URL and is tap or scan ready.",
    supportedDestinations: ["facebook"],
    displayText: "Follow us on Facebook",
    image: facebookFollowStandImage,
    seoTitle: "Facebook Follow Stand | NFC and QR Social Media Stand",
    seoDescription: "Buy a Facebook Follow Stand that opens your Facebook page or profile with one tap or scan.",
    searchKeywords: ["facebook follow stand", "facebook nfc stand", "follow us on facebook stand"]
  }),
  phaseOneProduct({
    slug: "instagram-follow-stand",
    title: "Instagram Follow Stand",
    sku: "TR-INSTAGRAM-FOLLOW-STAND",
    categorySlug: "social-media",
    standTypeSlug: "social-media-stands",
    primaryPlatformSlug: "instagram",
    destinationType: "social",
    businessUseSlugs: ["restaurant-food", "retail-local-business", "beauty-salon-wellness", "ecommerce-online-brand", "real-estate"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your Instagram profile.",
    description:
      "Instagram Follow Stand is a tabletop NFC and QR display for sending customers directly to your Instagram profile. It connects directly to one Instagram destination URL and is tap or scan ready.",
    supportedDestinations: ["instagram"],
    displayText: "Follow us on Instagram",
    image: instagramFollowStandImage,
    seoTitle: "Instagram Follow Stand | NFC and QR Social Media Stand",
    seoDescription: "Buy an Instagram Follow Stand that opens your Instagram profile with one tap or scan.",
    searchKeywords: ["instagram follow stand", "instagram nfc stand", "follow us on instagram stand"]
  }),
  phaseOneProduct({
    slug: "tiktok-follow-stand",
    title: "TikTok Follow Stand",
    sku: "TR-TIKTOK-FOLLOW-STAND",
    categorySlug: "social-media",
    standTypeSlug: "social-media-stands",
    primaryPlatformSlug: "tiktok",
    destinationType: "social",
    businessUseSlugs: ["restaurant-food", "retail-local-business", "beauty-salon-wellness", "ecommerce-online-brand"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your TikTok profile.",
    description:
      "TikTok Follow Stand is a tabletop NFC and QR display for sending customers directly to your TikTok profile. It connects directly to one TikTok destination URL and is tap or scan ready.",
    supportedDestinations: ["tiktok"],
    displayText: "Follow us on TikTok",
    image: tiktokFollowStandImage,
    seoTitle: "TikTok Follow Stand | NFC and QR Social Media Stand",
    seoDescription: "Buy a TikTok Follow Stand that opens your TikTok profile with one tap or scan.",
    searchKeywords: ["tiktok follow stand", "tiktok nfc stand", "follow us on tiktok stand"]
  }),
  phaseOneProduct({
    slug: "youtube-follow-stand",
    title: "YouTube Follow Stand",
    sku: "TR-YOUTUBE-FOLLOW-STAND",
    categorySlug: "social-media",
    standTypeSlug: "social-media-stands",
    primaryPlatformSlug: "youtube",
    destinationType: "social",
    businessUseSlugs: ["retail-local-business", "ecommerce-online-brand", "automotive", "real-estate"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your YouTube channel.",
    description:
      "YouTube Follow Stand is a tabletop NFC and QR display for sending customers directly to your YouTube channel. It connects directly to one YouTube destination URL and is tap or scan ready.",
    supportedDestinations: ["youtube"],
    displayText: "Follow us on YouTube",
    image: youtubeFollowStandImage,
    seoTitle: "YouTube Follow Stand | NFC and QR Social Media Stand",
    seoDescription: "Buy a YouTube Follow Stand that opens your YouTube channel with one tap or scan.",
    searchKeywords: ["youtube follow stand", "youtube nfc stand", "follow us on youtube stand"]
  }),
  phaseOneProduct({
    slug: "linkedin-follow-stand",
    title: "LinkedIn Follow Stand",
    sku: "TR-LINKEDIN-FOLLOW-STAND",
    categorySlug: "social-media",
    standTypeSlug: "social-media-stands",
    primaryPlatformSlug: "linkedin",
    destinationType: "social",
    businessUseSlugs: ["legal", "real-estate", "automotive", "retail-local-business", "ecommerce-online-brand"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your LinkedIn page or profile.",
    description:
      "LinkedIn Follow Stand is a tabletop NFC and QR display for sending customers directly to your LinkedIn page or profile. It connects directly to one LinkedIn destination URL and is tap or scan ready.",
    supportedDestinations: ["linkedin"],
    displayText: "Follow us on LinkedIn",
    image: linkedinFollowStandImage,
    seoTitle: "LinkedIn Follow Stand | NFC and QR Social Media Stand",
    seoDescription: "Buy a LinkedIn Follow Stand that opens your LinkedIn page or profile with one tap or scan.",
    searchKeywords: ["linkedin follow stand", "linkedin nfc stand", "follow us on linkedin stand"]
  }),
  phaseOneProduct({
    slug: "x-follow-stand",
    title: "X Follow Stand",
    sku: "TR-X-FOLLOW-STAND",
    categorySlug: "social-media",
    standTypeSlug: "social-media-stands",
    primaryPlatformSlug: "x",
    destinationType: "social",
    businessUseSlugs: ["retail-local-business", "ecommerce-online-brand", "automotive", "legal"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your X profile.",
    description:
      "X Follow Stand is a tabletop NFC and QR display for sending customers directly to your X profile. It connects directly to one X destination URL and is tap or scan ready.",
    supportedDestinations: ["x"],
    displayText: "Follow us on X",
    image: xFollowStandImage,
    seoTitle: "X Follow Stand | NFC and QR Social Media Stand",
    seoDescription: "Buy an X Follow Stand that opens your X profile with one tap or scan.",
    searchKeywords: ["x follow stand", "x nfc stand", "follow us on x stand"]
  }),
  phaseOneProduct({
    slug: "snapchat-follow-stand",
    title: "Snapchat Follow Stand",
    sku: "TR-SNAPCHAT-FOLLOW-STAND",
    categorySlug: "social-media",
    standTypeSlug: "social-media-stands",
    primaryPlatformSlug: "snapchat",
    destinationType: "social",
    businessUseSlugs: ["restaurant-food", "retail-local-business", "beauty-salon-wellness", "ecommerce-online-brand"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your Snapchat profile.",
    description:
      "Snapchat Follow Stand is a tabletop NFC and QR display for sending customers directly to your Snapchat profile. It connects directly to one Snapchat destination URL and is tap or scan ready.",
    supportedDestinations: ["snapchat"],
    displayText: "Follow us on Snapchat",
    image: snapchatFollowStandImage,
    seoTitle: "Snapchat Follow Stand | NFC and QR Social Media Stand",
    seoDescription: "Buy a Snapchat Follow Stand that opens your Snapchat profile with one tap or scan.",
    searchKeywords: ["snapchat follow stand", "snapchat nfc stand", "follow us on snapchat stand"]
  }),
  phaseOneProduct({
    slug: "pinterest-follow-stand",
    title: "Pinterest Follow Stand",
    sku: "TR-PINTEREST-FOLLOW-STAND",
    categorySlug: "social-media",
    standTypeSlug: "social-media-stands",
    primaryPlatformSlug: "pinterest",
    destinationType: "social",
    businessUseSlugs: ["retail-local-business", "ecommerce-online-brand", "beauty-salon-wellness", "real-estate"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your Pinterest profile.",
    description:
      "Pinterest Follow Stand is a tabletop NFC and QR display for sending customers directly to your Pinterest profile. It connects directly to one Pinterest destination URL and is tap or scan ready.",
    supportedDestinations: ["pinterest"],
    displayText: "Follow us on Pinterest",
    image: pinterestFollowStandImage,
    seoTitle: "Pinterest Follow Stand | NFC and QR Social Media Stand",
    seoDescription: "Buy a Pinterest Follow Stand that opens your Pinterest profile with one tap or scan.",
    searchKeywords: ["pinterest follow stand", "pinterest nfc stand", "follow us on pinterest stand"]
  }),
  phaseOneProduct({
    slug: "book-your-next-visit-stand",
    title: "Book Your Next Visit Stand",
    sku: "TR-BOOKING-STAND",
    categorySlug: "appointments",
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC stand that opens a booking page, appointment form, calendar, or scheduling URL.",
    description:
      "Book Your Next Visit Stand is a tabletop NFC display that opens a booking page, appointment form, calendar, or scheduling URL. It connects to one destination URL and is tap or scan ready.",
    supportedDestinations: ["booking", "website", "custom"],
    displayText: "Book Your Next Visit",
    image: bookingStandImage,
    seoTitle: "Book Your Next Visit Stand | Appointment Booking NFC Stand",
    seoDescription: "Countertop NFC stand that opens a booking page, appointment form, calendar, or scheduling URL.",
    searchKeywords: ["book your next visit stand", "appointment booking nfc stand", "booking nfc stand"]
  }),
  phaseOneProduct({
    slug: "book-your-next-visit-plate",
    title: "Book Your Next Visit Plate",
    sku: "TR-BOOKING-PLATE",
    categorySlug: "appointments",
    basePriceCents: platePriceCents,
    shortDescription: "Low-profile NFC plate that opens a booking page, appointment form, calendar, or scheduling URL.",
    description:
      "Book Your Next Visit Plate is a flat NFC prompt that opens a booking page, appointment form, calendar, or scheduling URL. It connects to one destination URL and is tap or scan ready.",
    supportedDestinations: ["booking", "website", "custom"],
    displayText: "Book Your Next Visit",
    image: bookingPlateImage,
    seoTitle: "Book Your Next Visit Plate | Appointment Booking NFC Plate",
    seoDescription: "Low-profile NFC plate that opens a booking page, appointment form, calendar, or scheduling URL.",
    searchKeywords: ["book your next visit plate", "appointment booking nfc plate", "booking nfc plate"]
  }),
  phaseOneProduct({
    slug: "view-our-menu-stand",
    title: "View Our Menu Stand",
    sku: "TR-MENU-STAND",
    categorySlug: "menu",
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC stand that opens a restaurant, cafe, or service menu.",
    description:
      "View Our Menu Stand is a tabletop NFC display that opens a restaurant, cafe, or service menu. It connects to one menu destination URL and is tap or scan ready.",
    supportedDestinations: ["menu", "website", "custom"],
    displayText: "View Our Menu",
    image: menuStandImage,
    seoTitle: "View Our Menu Stand | NFC Menu Stand",
    seoDescription: "Countertop NFC stand that opens a restaurant, cafe, or service menu with one tap or scan.",
    searchKeywords: ["view our menu stand", "nfc menu stand", "restaurant menu nfc stand"]
  }),
  phaseOneProduct({
    slug: "view-our-menu-plate",
    title: "View Our Menu Plate",
    sku: "TR-MENU-PLATE",
    categorySlug: "menu",
    basePriceCents: platePriceCents,
    shortDescription: "Low-profile NFC plate that opens a restaurant, cafe, or service menu.",
    description:
      "View Our Menu Plate is a flat NFC product that opens a restaurant, cafe, or service menu. It connects to one menu destination URL and is tap or scan ready.",
    supportedDestinations: ["menu", "website", "custom"],
    displayText: "View Our Menu",
    image: menuPlateImage,
    seoTitle: "View Our Menu Plate | Low-Profile NFC Menu Product",
    seoDescription: "Low-profile NFC plate that opens a restaurant, cafe, or service menu.",
    searchKeywords: ["view our menu plate", "nfc menu plate", "restaurant menu nfc plate"]
  }),
  phaseOneProduct({
    slug: "visit-our-website-stand",
    title: "Visit Our Website Stand",
    sku: "TR-WEBSITE-STAND",
    categorySlug: "website-links",
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your website, landing page, offer, or custom link.",
    description:
      "Visit Our Website Stand is a tabletop NFC and QR display for one important business link. It opens your website, landing page, offer, app download, or custom URL with one tap or scan.",
    supportedDestinations: ["website", "custom"],
    displayText: "Visit Our Website",
    image: { src: "/uploads/products/visit-website-stand.png", alt: "Tap Rater Visit Our Website Stand" },
    seoTitle: "Visit Our Website Stand | NFC Website Link Stand",
    seoDescription: "Buy a website link NFC stand that opens your business website, landing page, offer, app download, or custom URL.",
    searchKeywords: ["website nfc stand", "visit website stand", "custom link nfc stand"]
  }),
  {
    slug: "custom-direct-stand",
    title: "Custom Direct Stand",
    sku: "TR-CUSTOM-STAND",
    categorySlug: "custom-stands",
    basePriceCents: 4900,
    stockStatus: "instock",
    shortDescription: "Custom tabletop NFC and QR stand with your logo, business name, headline, and one destination link.",
    description:
      "Custom Direct Stand is a custom tabletop NFC and QR stand for one direct destination link. Add your logo, business name, custom headline or center graphic direction, and CTA sentence before approving the front proof.",
    productType: "physical_managed",
    serviceMode: "managed_redirect",
    checkoutMode: "buy_now",
    requiresAccount: false,
    requiresSubscription: false,
    requiresLandingPage: false,
    supportedDestinations: ["website", "custom", "google", "facebook", "yelp", "tripadvisor", "booking", "menu", "feedback"],
    activationType: "managed_setup",
    includedServiceLabel: "Managed custom stand setup",
    format: "stand",
    customizationOptions: ["custom_design"],
    allowsLogoUpload: true,
    allowsCustomDesign: true,
    designMode: "custom",
    displayText: "Your message here",
    images: [{ src: "/uploads/products/business-google-white-stand.jpg", alt: "Custom Tap Rater tabletop stand" }],
    variants: colors.map((color) => ({
      id: color.id,
      label: color.label,
      sku: `TR-CUSTOM-STAND-${color.suffix}`,
      stockStatus: "instock"
    })),
    isActive: false,
    seoTitle: "Custom Direct Stand | Custom NFC and QR Tabletop Stand",
    seoDescription: "Create a custom NFC and QR tabletop stand with your logo, business name, headline, CTA, and one direct destination link.",
    searchKeywords: ["custom nfc stand", "custom qr stand", "custom review stand"]
  }
];
