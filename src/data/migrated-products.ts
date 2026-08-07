export type SupportedDestination =
  | "google"
  | "facebook"
  | "yelp"
  | "tripadvisor"
  | "instagram"
  | "tiktok"
  | "booking"
  | "website"
  | "menu"
  | "wifi"
  | "feedback"
  | "referral"
  | "custom";

export type MigratedProduct = {
  slug: string;
  title: string;
  sku: string;
  categorySlug: CatalogCategorySlug;
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
  featured?: boolean;
  displayText?: string;
  images: { src: string; alt: string }[];
  variants: { id: string; label: string; sku: string; stockStatus: "instock" | "outofstock"; imageSrc?: string }[];
  isActive: boolean;
  seoTitle?: string;
  seoDescription?: string;
  searchKeywords?: string[];
  // Design logic (2026-08-07): which printed-design template rules govern the
  // physical stand. Distinct from productType/serviceMode/checkoutMode, which
  // are about fulfillment and checkout mechanics -- this is specifically
  // about what gets printed and what the customer is asked to provide.
  designLogic: DesignLogicType;
  // Business-model pricing tier this product belongs to. Informational/
  // classification -- basePriceCents remains the actual editable price, this
  // field is what lets admin (and future Stripe price ID wiring) group
  // products by which of the 4 core offerings they represent.
  pricingTier: PricingTier;
  // Which business types this product is recommended for (Shop by Use).
  // A product can belong to many use cases without being duplicated as a
  // separate SKU -- see src/data/use-cases.ts.
  useCaseSlugs: string[];
  // Which review/booking/social platform this product represents, if any
  // (e.g. "google", "yelp", "vagaro"). Used to pick the correct branded
  // template and to group provider options under a generic action.
  platformSlug?: string;
  // For branded_platform_template and text_action_branded products: the set
  // of template images (standard vs branded vs branded+QR variants), keyed
  // so new platform templates can be added purely as data (new image paths),
  // without a code change.
  templateImages?: ProductTemplateImages;
  // For text_action_locked / text_action_branded products backed by a
  // generic action (e.g. "Book Appointment") that maps to many possible
  // third-party providers (Vagaro, Calendly, etc.) -- these are NOT
  // separate products/SKUs, they're selectable options under this one
  // product. Per the product cleanup rules: branded booking tools and form
  // tools must never be standalone products.
  providerOptions?: ProductProviderOption[];
  // Color/finish variations, distinct from `variants` (which are structured
  // for stock/SKU tracking). This is a simple display list of available
  // colors/finishes for the admin color picker and storefront swatch UI.
  colorOptions?: string[];
};

export type DesignLogicType =
  // Example: Standard Google Review Stand. Platform logo/design locked.
  // Customer only enters a destination link. No logo upload.
  | "standard_platform_locked"
  // Example: Google Review Stand with business logo/name added. Platform
  // logo and CTA stay locked; customer can add business logo + name and
  // adjust their size. Gets a QR area when the Branded + QR tier is
  // selected. Must support future platform templates (Yelp, TripAdvisor,
  // Facebook, etc.) via templateImages, not new code.
  | "branded_platform_template"
  // Example: Book Appointment, View Menu, Order Online. No platform logo --
  // the printed middle area is text/action based. Customer enters a
  // destination link, and optionally a business name depending on the
  // product's own setting.
  | "text_action_locked"
  // Example: branded Book Appointment, or Hosted Multi-Link. Customer adds
  // logo/business name; the printed text/action itself is controlled by the
  // product/template. Hosted Multi-Link always uses this, since the
  // physical stand points to one hosted page with many links rather than a
  // single destination.
  | "text_action_branded"
  // Custom Stand only. Customer submits business name, link, notes, and a
  // design request. If durable file upload isn't wired up yet, the product
  // page must say logo/design files are collected after checkout -- never
  // imply a file was stored unless that's actually true.
  | "fully_custom_design";

export type PricingTier =
  | "standard_direct" // Standard Direct Stand -- $39 one-time
  | "branded_qr_direct" // Branded + QR Direct Stand -- $49 one-time
  | "hosted_multi_link" // Hosted Multi-Link Stand -- $49 setup + $9.90/month
  | "custom"; // Custom Stand -- price confirmed per existing intended pricing, not assumed

export type ProductTemplateImageVariant = {
  src: string;
  alt: string;
};

export type ProductTemplateImages = {
  // Platform logo/CTA locked, no customer branding.
  standard?: ProductTemplateImageVariant;
  // Customer logo + business name added, platform logo/CTA still locked.
  branded?: ProductTemplateImageVariant;
  // Branded, plus a QR code area.
  brandedWithQr?: ProductTemplateImageVariant;
};

export type ProductProviderOption = {
  slug: string;
  label: string;
  // Optional hint shown to the customer/admin for what a destination URL
  // from this provider typically looks like -- never a stored credential.
  destinationUrlHint?: string;
};

export type ProductCommerceType = "physical_redirect" | "physical_managed" | "platform_landing_page" | "bundle";

export type ProductServiceMode = "basic_redirect" | "managed_redirect" | "hosted_landing_page" | "multi_location_platform";

export type ProductCheckoutMode = "buy_now" | "request_quote" | "subscription" | "contact_sales";

export type ProductActivationType = "free_basic_activation" | "managed_setup" | "premium_hosted_activation";

export type ProductFormat = "stand" | "plate" | "bundle" | "platform";

export type ProductCustomizationOption = "standard_design" | "add_logo" | "custom_design";

export type ProductDesignMode = "standard" | "logo" | "custom";

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
    description: "Custom printed NFC and QR tabletop stands for one direct destination link.",
    seoTitle: "Custom NFC Stands | Tap Rater",
    seoDescription: "Create a custom NFC and QR tabletop stand with your logo, business name, custom headline, and one destination link.",
    buyerIntent: "For businesses that want a branded stand with custom wording or a custom center graphic.",
    aliases: ["custom-nfc-stands", "custom-qr-stands"],
    seoCopy:
      "Custom stands use a locked production template so the customer can personalize the stand without breaking print layout."
  }
];

const googleStandImage = { src: "/uploads/products/google-review-stand.png", alt: "Tap Rater Google Review Stand" };
const googlePlateImage = { src: "/uploads/products/google-review-plate.png", alt: "Tap Rater Google Review Plate" };
const yelpStandImage = { src: "/uploads/products/yelp-review-stand.png", alt: "Tap Rater Yelp Review Stand" };
const yelpPlateImage = { src: "/uploads/products/yelp-review-plate.png", alt: "Tap Rater Yelp Review Plate placeholder" };
const facebookStandImage = { src: "/uploads/products/facebook-review-stand.png", alt: "Tap Rater Facebook Review Stand" };
const facebookPlateImage = { src: "/uploads/products/facebook-review-plate.png", alt: "Tap Rater Facebook Review Plate placeholder" };
const tripadvisorStandImage = { src: "/uploads/products/tripadvisor-review-stand.png", alt: "Tap Rater TripAdvisor Review Stand" };
const tripadvisorPlateImage = { src: "/uploads/products/tripadvisor-review-plate.png", alt: "Tap Rater TripAdvisor Review Plate placeholder" };
const experienceStandImage = { src: "/uploads/products/rate-your-experience-stand.png", alt: "Tap Rater Rate Your Experience Stand" };
const experiencePlateImage = { src: "/uploads/products/rate-your-experience-plate.png", alt: "Tap Rater Rate Your Experience Plate placeholder" };
const socialStandImage = { src: "/uploads/products/social-media-stand.png", alt: "Tap Rater Follow Us on Social Media Stand" };
const socialPlateImage = { src: "/uploads/products/social-media-plate.png", alt: "Tap Rater Follow Us on Social Media Plate placeholder" };
const bookingStandImage = { src: "/uploads/products/book-next-visit-stand.png", alt: "Tap Rater Book Your Next Visit Stand" };
const bookingPlateImage = { src: "/uploads/products/book-next-visit-plate.png", alt: "Tap Rater Book Your Next Visit Plate placeholder" };
const menuStandImage = { src: "/uploads/products/view-menu-stand.png", alt: "Tap Rater View Our Menu Stand" };
const menuPlateImage = { src: "/uploads/products/view-menu-plate.png", alt: "Tap Rater View Our Menu Plate placeholder" };

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
  basePriceCents: number;
  shortDescription: string;
  description: string;
  supportedDestinations: SupportedDestination[];
  displayText: string;
  image: { src: string; alt: string };
  seoTitle: string;
  seoDescription: string;
  searchKeywords: string[];
  designLogic: DesignLogicType;
  useCaseSlugs: string[];
  platformSlug?: string;
  providerOptions?: ProductProviderOption[];
};

function phaseOneProduct(input: PhaseOneProductInput): MigratedProduct {
  return {
    slug: input.slug,
    title: input.title,
    sku: input.sku,
    categorySlug: input.categorySlug,
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
    // Every product built via this factory is priced at standPriceCents
    // ($39), which is the Standard Direct Stand tier by definition.
    pricingTier: "standard_direct",
    designLogic: input.designLogic,
    useCaseSlugs: input.useCaseSlugs,
    platformSlug: input.platformSlug,
    providerOptions: input.providerOptions,
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
    designLogic: "standard_platform_locked",
    useCaseSlugs: ["restaurants-cafes", "retail-grocery", "healthcare-dental", "salons-spas-wellness"],
    platformSlug: "google",
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC stand that opens your Google review link with one tap or scan.",
    description:
      "Google Review Stand is a tabletop NFC display for counters, desks, checkout areas, and reception spaces. It opens your Google review link through free basic activation, connects to one destination URL, and is tap or scan ready.",
    supportedDestinations: ["google"],
    displayText: "Review us on Google",
    image: googleStandImage,
    seoTitle: "Google Review Stand | NFC Review Stand for Local Businesses",
    seoDescription: "Buy a Google Review Stand that opens your Google review link with one tap or scan. No monthly fee required for basic activation.",
    searchKeywords: ["google review stand", "google nfc stand", "review us on google stand"]
  }),
  phaseOneProduct({
    slug: "google-review-plate",
    title: "Google Review Plate",
    sku: "TR-GOOGLE-PLATE",
    categorySlug: "reviews",
    designLogic: "standard_platform_locked",
    useCaseSlugs: ["restaurants-cafes", "retail-grocery", "healthcare-dental", "salons-spas-wellness"],
    platformSlug: "google",
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
    designLogic: "standard_platform_locked",
    useCaseSlugs: ["restaurants-cafes", "retail-grocery"],
    platformSlug: "yelp",
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC stand that opens your Yelp review or business profile destination.",
    description:
      "Yelp Review Stand is a tabletop NFC display for businesses that want customers to open a Yelp review or business profile destination. It connects to one destination URL and does not require a monthly fee for basic activation.",
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
    designLogic: "standard_platform_locked",
    useCaseSlugs: ["restaurants-cafes", "retail-grocery"],
    platformSlug: "yelp",
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
    designLogic: "standard_platform_locked",
    useCaseSlugs: ["restaurants-cafes", "retail-grocery", "events-popups"],
    platformSlug: "facebook",
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
    designLogic: "standard_platform_locked",
    useCaseSlugs: ["restaurants-cafes", "retail-grocery", "events-popups"],
    platformSlug: "facebook",
    basePriceCents: platePriceCents,
    shortDescription: "Low-profile NFC plate for Facebook reviews, recommendations, or profile visits.",
    description:
      "Facebook Review Plate is a flat NFC product for Facebook reviews, recommendations, or profile visits. It connects to one destination URL and does not require a monthly fee for basic activation.",
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
    designLogic: "standard_platform_locked",
    useCaseSlugs: ["restaurants-cafes", "hotels-hospitality"],
    platformSlug: "tripadvisor",
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
    designLogic: "standard_platform_locked",
    useCaseSlugs: ["restaurants-cafes", "hotels-hospitality"],
    platformSlug: "tripadvisor",
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
    slug: "rate-your-experience-stand",
    title: "Rate Your Experience Stand",
    sku: "TR-EXPERIENCE-STAND",
    categorySlug: "feedback",
    designLogic: "text_action_locked",
    useCaseSlugs: ["healthcare-dental", "home-services", "auto-dealer-repair", "front-desk-reception"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC stand for collecting customer experience feedback through a Tap Rater destination.",
    description:
      "Rate Your Experience Stand is a tabletop NFC display for customer experience feedback through a Tap Rater destination. It connects to one destination URL and can support a direct feedback or follow-up flow.",
    supportedDestinations: ["feedback", "custom"],
    displayText: "Rate Your Experience",
    image: experienceStandImage,
    seoTitle: "Rate Your Experience Stand | NFC Feedback Stand",
    seoDescription: "Countertop NFC stand for collecting customer experience feedback through a Tap Rater destination.",
    searchKeywords: ["rate your experience stand", "feedback nfc stand", "customer experience stand"],
    providerOptions: [
      { slug: "google-forms", label: "Google Forms", destinationUrlHint: "https://forms.gle/your-form" },
      { slug: "jotform", label: "Jotform", destinationUrlHint: "https://form.jotform.com/your-form" },
      { slug: "surveymonkey", label: "SurveyMonkey", destinationUrlHint: "https://www.surveymonkey.com/r/your-survey" },
      { slug: "typeform", label: "Typeform", destinationUrlHint: "https://your-business.typeform.com/to/your-form" },
      { slug: "custom", label: "Other / custom link" }
    ]
  }),
  phaseOneProduct({
    slug: "rate-your-experience-plate",
    title: "Rate Your Experience Plate",
    sku: "TR-EXPERIENCE-PLATE",
    categorySlug: "feedback",
    designLogic: "text_action_locked",
    useCaseSlugs: ["healthcare-dental", "home-services", "auto-dealer-repair", "front-desk-reception"],
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
    designLogic: "text_action_locked",
    useCaseSlugs: ["restaurants-cafes", "salons-spas-wellness", "events-popups"],
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
    designLogic: "text_action_locked",
    useCaseSlugs: ["restaurants-cafes", "salons-spas-wellness", "events-popups"],
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
    slug: "book-your-next-visit-stand",
    title: "Book Your Next Visit Stand",
    sku: "TR-BOOKING-STAND",
    categorySlug: "appointments",
    designLogic: "text_action_locked",
    useCaseSlugs: ["healthcare-dental", "salons-spas-wellness", "auto-dealer-repair"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC stand that opens a booking page, appointment form, calendar, or scheduling URL.",
    description:
      "Book Your Next Visit Stand is a tabletop NFC display that opens a booking page, appointment form, calendar, or scheduling URL. It connects to one destination URL and is tap or scan ready.",
    supportedDestinations: ["booking", "website", "custom"],
    displayText: "Book Your Next Visit",
    image: bookingStandImage,
    seoTitle: "Book Your Next Visit Stand | Appointment Booking NFC Stand",
    seoDescription: "Countertop NFC stand that opens a booking page, appointment form, calendar, or scheduling URL.",
    searchKeywords: ["book your next visit stand", "appointment booking nfc stand", "booking nfc stand"],
    providerOptions: [
      { slug: "vagaro", label: "Vagaro", destinationUrlHint: "https://www.vagaro.com/your-business" },
      { slug: "fresha", label: "Fresha", destinationUrlHint: "https://www.fresha.com/a/your-business" },
      { slug: "booksy", label: "Booksy", destinationUrlHint: "https://booksy.com/en-us/your-business" },
      { slug: "mindbody", label: "Mindbody", destinationUrlHint: "https://www.mindbodyonline.com/explore/your-business" },
      { slug: "zocdoc", label: "Zocdoc", destinationUrlHint: "https://www.zocdoc.com/practice/your-business" },
      { slug: "calendly", label: "Calendly", destinationUrlHint: "https://calendly.com/your-business" },
      { slug: "acuity", label: "Acuity Scheduling", destinationUrlHint: "https://app.acuityscheduling.com/schedule.php?owner=your-id" },
      { slug: "square-appointments", label: "Square Appointments", destinationUrlHint: "https://your-business.square.site" },
      { slug: "opentable", label: "OpenTable", destinationUrlHint: "https://www.opentable.com/r/your-business" },
      { slug: "resy", label: "Resy", destinationUrlHint: "https://resy.com/cities/your-city/your-business" },
      { slug: "custom", label: "Other / custom link" }
    ]
  }),
  phaseOneProduct({
    slug: "book-your-next-visit-plate",
    title: "Book Your Next Visit Plate",
    sku: "TR-BOOKING-PLATE",
    categorySlug: "appointments",
    designLogic: "text_action_locked",
    useCaseSlugs: ["healthcare-dental", "salons-spas-wellness", "auto-dealer-repair"],
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
    designLogic: "text_action_locked",
    useCaseSlugs: ["restaurants-cafes"],
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
    designLogic: "text_action_locked",
    useCaseSlugs: ["restaurants-cafes"],
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
    designLogic: "text_action_locked",
    useCaseSlugs: ["real-estate", "retail-grocery", "restaurants-cafes"],
    basePriceCents: standPriceCents,
    shortDescription: "Countertop NFC and QR stand that opens your website, landing page, offer, or custom link.",
    description:
      "Visit Our Website Stand is a tabletop NFC and QR display for one important business link. It opens your website, landing page, offer, app download, or custom URL with one tap or scan.",
    supportedDestinations: ["website", "custom"],
    displayText: "Visit Our Website",
    image: socialStandImage,
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
    shortDescription: "Custom printed tabletop NFC and QR stand with your logo, business name, headline, and one destination link.",
    description:
      "Custom Direct Stand is a custom printed tabletop NFC and QR stand for one direct destination link. Add your logo, business name, custom headline or center graphic direction, and CTA sentence before approving the front proof.",
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
    designLogic: "fully_custom_design",
    pricingTier: "custom",
    // Existing intended price ($49) confirmed, not changed, per instruction
    // to confirm before touching Custom Stand pricing.
    useCaseSlugs: ["restaurants-cafes", "retail-grocery", "healthcare-dental", "real-estate", "events-popups"],
    displayText: "Your message here",
    images: [{ src: "/uploads/products/business-google-white-stand.jpg", alt: "Custom Tap Rater tabletop stand" }],
    variants: colors.map((color) => ({
      id: color.id,
      label: color.label,
      sku: `TR-CUSTOM-STAND-${color.suffix}`,
      stockStatus: "instock"
    })),
    isActive: true,
    seoTitle: "Custom Direct Stand | Custom NFC and QR Tabletop Stand",
    seoDescription: "Create a custom NFC and QR tabletop stand with your logo, business name, headline, CTA, and one direct destination link.",
    searchKeywords: ["custom nfc stand", "custom qr stand", "custom review stand"]
  },
  {
    slug: "hosted-multi-link-stand",
    title: "Hosted Multi-Link Stand",
    sku: "TR-HOSTED-MULTILINK",
    categorySlug: "website-links",
    basePriceCents: 4900,
    stockStatus: "instock",
    shortDescription:
      "One NFC and QR stand that opens a hosted Tap Rater page with all your links -- reviews, booking, menu, social, and more.",
    description:
      "Hosted Multi-Link Stand points to one hosted Tap Rater page instead of a single destination link. Add and reorder as many links as you need -- Google review, booking, menu, social profiles, website -- without ever reprinting the stand. Includes your logo and business name on the printed design and the hosted page. $49 one-time setup, then $9.90/month for hosting and unlimited link edits.",
    productType: "platform_landing_page",
    serviceMode: "hosted_landing_page",
    checkoutMode: "subscription",
    requiresAccount: true,
    requiresSubscription: true,
    requiresLandingPage: true,
    supportedDestinations: ["custom"],
    activationType: "premium_hosted_activation",
    includedServiceLabel: "Hosted page setup + unlimited link edits",
    format: "stand",
    customizationOptions: ["add_logo"],
    allowsLogoUpload: true,
    allowsCustomDesign: false,
    designMode: "logo",
    designLogic: "text_action_branded",
    pricingTier: "hosted_multi_link",
    useCaseSlugs: ["restaurants-cafes", "retail-grocery", "real-estate", "events-popups", "home-services"],
    displayText: "Tap for everything",
    images: [{ src: "/uploads/products/social-media-stand.png", alt: "Tap Rater Hosted Multi-Link Stand" }],
    variants: colors.map((color) => ({
      id: color.id,
      label: color.label,
      sku: `TR-HOSTED-MULTILINK-${color.suffix}`,
      stockStatus: "instock"
    })),
    isActive: true,
    seoTitle: "Hosted Multi-Link Stand | One NFC Stand, All Your Links",
    seoDescription: "One NFC and QR stand that opens a hosted page with all your business links -- reviews, booking, menu, social, and more.",
    searchKeywords: ["multi link nfc stand", "hosted link page stand", "link in bio nfc stand", "linktree nfc alternative"]
  }
];
