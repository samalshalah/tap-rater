// Exact migrations for retired public sales copy and photos. Never applied to saved orders.
const retiredClaims: [string, string][] = [
  [
    "Standard is NFC-only; Branded adds printed QR, your logo, and business name.",
    "Every stand includes your logo, business name, NFC and a printed QR code."
  ],
  [
    "Standard is NFC-only; Branded adds your logo and a printed QR code.",
    "Your logo and a printed QR code are included alongside NFC."
  ],
  [
    "Standard is NFC-only. Branded adds your logo, business name and a destination QR code.",
    "Every stand includes your logo, business name, NFC and a destination QR code."
  ],
  [
    "Explore Standard and Branded stands",
    "Explore custom logo and QR stands"
  ],
  [
    "Standard is NFC-only; Branded adds printed QR.",
    "Every stand includes NFC and printed QR."
  ],
  [
    "Standard or Branded?",
    "Made for your business"
  ],
  [
    "Standard uses NFC only. Choose Branded when you want your logo, business name and a printed QR code for customers who prefer scanning.",
    "Your custom stand includes NFC, your logo, business name and a printed QR code for customers who prefer scanning."
  ],
  [
    "Standard gives you an NFC tap. Branded adds your logo, business name and a printed QR.",
    "Your custom stand includes NFC, your logo, business name and a printed QR."
  ],
  [
    "Standard is NFC-only; Branded adds your business identity and a printed QR code.",
    "Your custom stand includes NFC, your business identity and a printed QR code."
  ],
  [
    "Standard lets customers tap NFC; Branded also provides a QR code.",
    "Customers can tap NFC or scan the printed QR code on every custom stand."
  ],
  [
    "Standard is NFC-only; Branded adds your logo, business name and QR code.",
    "Every custom stand includes NFC, your logo, business name and QR code."
  ],
  [
    "Standard direct stands are NFC-only. Branded adds your logo, business name and a destination QR code.",
    "Custom direct stands include NFC, your logo, business name and a destination QR code."
  ],
  [
    " Standard provides NFC without a printed QR.",
    ""
  ],
  [
    " Standard uses NFC only.",
    ""
  ],
  [
    "Use Branded for your logo, business name and QR code, or Standard for NFC only.",
    "Your custom stand includes NFC, your logo, business name and QR code."
  ],
  [
    "Branded adds a logo and QR; Standard uses NFC only.",
    "Your logo and QR code are included alongside NFC."
  ],
  [
    "Standard stands are NFC-only and have no printed QR code.",
    "Every new stand includes your logo and QR code."
  ],
  [
    "Standard remains NFC-only, with no printed QR. Branded adds a QR code pointing to the same page.",
    "Your custom stand includes NFC and a QR code pointing to the same page."
  ],
  [
    "Standard provides NFC; Branded adds your business identity and a printed QR code for customers who prefer scanning.",
    "Your custom stand includes NFC, your business identity and a printed QR code for customers who prefer scanning."
  ],
  [
    "Compare Standard and Branded + QR",
    "Explore custom logo and QR"
  ],
  [
    "Standard stands use NFC; Branded designs add your restaurant name, logo, and a printed QR code for guests who prefer scanning.",
    "Custom stands include NFC, your restaurant name, logo, and a printed QR code for guests who prefer scanning."
  ],
  [
    "Standard stands use NFC only and do not include a printed QR code.",
    "Every new stand includes both NFC and a printed QR code."
  ],
  [
    " Standard is NFC-only.",
    ""
  ],
  [
    "Standard stands support NFC tapping; Branded designs add your property name, logo, and printed QR code for guests who prefer their phone camera.",
    "Custom stands support NFC tapping and include your property name, logo, and printed QR code for guests who prefer their phone camera."
  ],
  [
    "Standard offers NFC tapping; Branded adds the practice name, logo, and a printed QR code.",
    "Custom stands include NFC, the practice name, logo, and a printed QR code."
  ],
  [
    "Standard provides a ready-made NFC design. Branded adds your practice name, logo, and printed QR code for visitors who prefer scanning.",
    "Custom stands include NFC, your practice name, logo, and printed QR code for visitors who prefer scanning."
  ],
  [
    "Standard stands use NFC; Branded designs add your business name, logo, and printed QR code for a scan option.",
    "Custom stands include NFC, your business name, logo, and printed QR code for a scan option."
  ],
  [
    "Standard offers NFC; Branded adds your firm name, logo, and a printed QR code.",
    "Custom stands include NFC, your firm name, logo, and a printed QR code."
  ],
  [
    "Standard supports NFC tapping; Branded adds your name, logo, and printed QR so visitors can also scan.",
    "Custom stands support NFC tapping and include your name, logo, and printed QR so visitors can also scan."
  ],
  [
    "Standard designs offer NFC; Branded adds your business identity and a printed QR code for clients who prefer scanning with their phone.",
    "Custom designs offer NFC, your business identity and a printed QR code for clients who prefer scanning with their phone."
  ],
  [
    " Standard offers a ready-made NFC-only design.",
    ""
  ],
  [
    "Standard uses NFC tapping; Branded adds your logo, business name, and printed QR code.",
    "Custom stands include NFC, your logo, business name, and printed QR code."
  ],
  [
    "Standard stands provide NFC tapping; Branded adds your store name, logo, and a printed QR code.",
    "Custom stands include NFC, your store name, logo, and a printed QR code."
  ],
  [
    "Branded + QR includes a printed QR code as well as NFC, while Standard uses NFC only.",
    "Every custom stand includes a printed QR code as well as NFC."
  ],
  [
    "Standard and Branded designs can be mixed.",
    "Mix custom designs for different destinations."
  ],
  [
    "Standard and Branded stands are prepared",
    "Custom stands are prepared"
  ],
  [
    "Choose Standard for NFC tapping or Branded + QR for your logo, business name, and a printed QR code.",
    "Every custom stand includes NFC, your logo, business name, and a printed QR code."
  ],
  [
    "Choose Standard or Branded + QR",
    "Personalize your stand"
  ],
  [
    "Standard Direct is ready for checkout.",
    "Custom logo and QR stands are ready for setup."
  ],
  [
    "A Standard Direct stand opens one customer-provided destination URL by NFC tap, with no printed QR.",
    "A custom Direct stand opens your destination URL by NFC tap or printed QR."
  ],
  [
    "Branded adds a QR code generated from your destination, your logo, and business name.",
    "Your logo, business name and QR code are included."
  ],
  [
    "Do Standard Direct stands require",
    "Do custom Direct stands require"
  ],
  [
    "Standard Direct sends NFC taps directly",
    "Custom Direct sends NFC taps and QR scans directly"
  ],
  [
    "Standard is NFC-only, with no printed QR. Branded adds a destination-generated QR, logo, and business name.",
    "Every custom stand includes NFC, a destination-generated QR, logo, and business name."
  ],
  [
    "Standard uses NFC only, with no printed QR. Branded adds a QR code generated from the same Google review link.",
    "NFC and the printed QR code open the same Google review link."
  ],
  [
    "Standard is NFC-only; Branded adds a printed QR code.",
    "Every custom stand includes NFC, your logo and a printed QR code."
  ],
  [
    "Standard is NFC-only, with no printed QR.",
    "Every new stand includes your logo, business name, NFC and a printed QR code."
  ],
  [
    "Choose Standard for the ready-made Tap Rater Google design, or Branded to add your logo and business name.",
    "Personalize your stand with your logo and business name."
  ],
  [
    "Standard Direct is ready for checkout.",
    "Custom stands are ready for setup."
  ],
  [
    "Standard Direct Stand",
    "Custom Stand"
  ]
];
const retiredImages: Record<string, string> = {
  "/uploads/marketing/homepage-cafe-review-illustration.png": "/product-galleries/google-custom/tap-rater-custom-google-review-stand-05-countertop-scene.webp",
  "/uploads/products/taprater-text-stands/check-our-information/check-our-information-standard-angled.png": "/uploads/products/taprater-text-stands/check-our-information/check-our-information-custom-angled.png",
  "/uploads/products/taprater-text-stands/connect-with-us/connect-with-us-standard-angled.png": "/uploads/products/taprater-text-stands/connect-with-us/connect-with-us-custom-angled.png",
  "/uploads/products/taprater-text-stands/explore-our-services/explore-our-services-standard-angled.png": "/uploads/products/taprater-text-stands/explore-our-services/explore-our-services-custom-angled.png",
  "/uploads/products/taprater-text-stands/follow-us-on-social-media/follow-us-on-social-media-standard-angled.png": "/uploads/products/taprater-text-stands/follow-us-on-social-media/follow-us-on-social-media-custom-angled.png",
  "/uploads/products/taprater-text-stands/menu-and-order/menu-and-order-standard-angled.png": "/uploads/products/taprater-text-stands/menu-and-order/menu-and-order-custom-angled.png",
  "/uploads/products/taprater-text-stands/patient-resources/patient-resources-standard-angled.png": "/uploads/products/taprater-text-stands/patient-resources/patient-resources-custom-angled.png",
  "/uploads/products/taprater-text-stands/rate-your-experience/rate-your-experience-standard-angled.png": "/uploads/products/taprater-text-stands/rate-your-experience/rate-your-experience-custom-angled.png",
  "/uploads/products/taprater-stands/agoda/agoda-standard-angled.png": "/uploads/products/taprater-stands/agoda/agoda-custom-angled.png",
  "/uploads/products/taprater-stands/airbnb/airbnb-standard-angled.png": "/uploads/products/taprater-stands/airbnb/airbnb-custom-angled.png",
  "/uploads/products/taprater-stands/angi/angi-standard-angled.png": "/uploads/products/taprater-stands/angi/angi-custom-angled.png",
  "/uploads/products/taprater-stands/apartments-com/apartments-com-standard-angled.png": "/uploads/products/taprater-stands/apartments-com/apartments-com-custom-angled.png",
  "/uploads/products/taprater-stands/autotrader/autotrader-standard-angled.png": "/uploads/products/taprater-stands/autotrader/autotrader-custom-angled.png",
  "/uploads/products/taprater-stands/avvo/avvo-standard-angled.png": "/uploads/products/taprater-stands/avvo/avvo-custom-angled.png",
  "/uploads/products/taprater-stands/bbb/bbb-standard-angled.png": "/uploads/products/taprater-stands/bbb/bbb-custom-angled.png",
  "/uploads/products/taprater-stands/booksy/booksy-standard-angled.png": "/uploads/products/taprater-stands/booksy/booksy-custom-angled.png",
  "/uploads/products/taprater-stands/caredash/caredash-standard-angled.png": "/uploads/products/taprater-stands/caredash/caredash-custom-angled.png",
  "/uploads/products/taprater-stands/carfax/carfax-standard-angled.png": "/uploads/products/taprater-stands/carfax/carfax-custom-angled.png",
  "/uploads/products/taprater-stands/cargurus/cargurus-standard-angled.png": "/uploads/products/taprater-stands/cargurus/cargurus-custom-angled.png",
  "/uploads/products/taprater-stands/cars-com/cars-com-standard-angled.png": "/uploads/products/taprater-stands/cars-com/cars-com-custom-angled.png",
  "/uploads/products/taprater-stands/check-our-information/check-our-information-standard-angled.png": "/uploads/products/taprater-stands/check-our-information/check-our-information-custom-angled.png",
  "/uploads/products/taprater-stands/connect-with-us/connect-with-us-standard-angled.png": "/uploads/products/taprater-stands/connect-with-us/connect-with-us-custom-angled.png",
  "/uploads/products/taprater-stands/dealerrater/dealerrater-standard-angled.png": "/uploads/products/taprater-stands/dealerrater/dealerrater-custom-angled.png",
  "/uploads/products/taprater-stands/edmunds/edmunds-standard-angled.png": "/uploads/products/taprater-stands/edmunds/edmunds-custom-angled.png",
  "/uploads/products/taprater-stands/explore-our-services/explore-our-services-standard-angled.png": "/uploads/products/taprater-stands/explore-our-services/explore-our-services-custom-angled.png",
  "/uploads/products/taprater-stands/facebook/facebook-standard-angled.png": "/uploads/products/taprater-stands/facebook/facebook-custom-angled.png",
  "/uploads/products/taprater-stands/facebook-follow/facebook-follow-standard-angled.png": "/uploads/products/taprater-stands/facebook-follow/facebook-follow-custom-angled.png",
  "/uploads/products/taprater-stands/findlaw/findlaw-standard-angled.png": "/uploads/products/taprater-stands/findlaw/findlaw-custom-angled.png",
  "/uploads/products/taprater-stands/follow-us-on-social-media/follow-us-on-social-media-standard-angled.png": "/uploads/products/taprater-stands/follow-us-on-social-media/follow-us-on-social-media-custom-angled.png",
  "/uploads/products/taprater-stands/fresha/fresha-standard-angled.png": "/uploads/products/taprater-stands/fresha/fresha-custom-angled.png",
  "/uploads/products/taprater-stands/google/google-standard-angled.png": "/uploads/products/taprater-stands/google/google-custom-angled.png",
  "/uploads/products/taprater-stands/healthgrades/healthgrades-standard-angled.png": "/uploads/products/taprater-stands/healthgrades/healthgrades-custom-angled.png",
  "/uploads/products/taprater-stands/homeadvisor/homeadvisor-standard-angled.png": "/uploads/products/taprater-stands/homeadvisor/homeadvisor-custom-angled.png",
  "/uploads/products/taprater-stands/homes-com/homes-com-standard-angled.png": "/uploads/products/taprater-stands/homes-com/homes-com-custom-angled.png",
  "/uploads/products/taprater-stands/hotels-com/hotels-com-standard-angled.png": "/uploads/products/taprater-stands/hotels-com/hotels-com-custom-angled.png",
  "/uploads/products/taprater-stands/houzz/houzz-standard-angled.png": "/uploads/products/taprater-stands/houzz/houzz-custom-angled.png",
  "/uploads/products/taprater-stands/instagram-follow/instagram-follow-standard-angled.png": "/uploads/products/taprater-stands/instagram-follow/instagram-follow-custom-angled.png",
  "/uploads/products/taprater-stands/lawyers-com/lawyers-com-standard-angled.png": "/uploads/products/taprater-stands/lawyers-com/lawyers-com-custom-angled.png",
  "/uploads/products/taprater-stands/linkedin/linkedin-standard-angled.png": "/uploads/products/taprater-stands/linkedin/linkedin-custom-angled.png",
  "/uploads/products/taprater-stands/linkedin-follow/linkedin-follow-standard-angled.png": "/uploads/products/taprater-stands/linkedin-follow/linkedin-follow-custom-angled.png",
  "/uploads/products/taprater-stands/martindale/martindale-standard-angled.png": "/uploads/products/taprater-stands/martindale/martindale-custom-angled.png",
  "/uploads/products/taprater-stands/menu-and-order/menu-and-order-standard-angled.png": "/uploads/products/taprater-stands/menu-and-order/menu-and-order-custom-angled.png",
  "/uploads/products/taprater-stands/nextdoor/nextdoor-standard-angled.png": "/uploads/products/taprater-stands/nextdoor/nextdoor-custom-angled.png",
  "/uploads/products/taprater-stands/opencare/opencare-standard-angled.png": "/uploads/products/taprater-stands/opencare/opencare-custom-angled.png",
  "/uploads/products/taprater-stands/patient-resources/patient-resources-standard-angled.png": "/uploads/products/taprater-stands/patient-resources/patient-resources-custom-angled.png",
  "/uploads/products/taprater-stands/pinterest-follow/pinterest-follow-standard-angled.png": "/uploads/products/taprater-stands/pinterest-follow/pinterest-follow-custom-angled.png",
  "/uploads/products/taprater-stands/porch/porch-standard-angled.png": "/uploads/products/taprater-stands/porch/porch-custom-angled.png",
  "/uploads/products/taprater-stands/rate-your-experience/rate-your-experience-standard-angled.png": "/uploads/products/taprater-stands/rate-your-experience/rate-your-experience-custom-angled.png",
  "/uploads/products/taprater-stands/ratemds/ratemds-standard-angled.png": "/uploads/products/taprater-stands/ratemds/ratemds-custom-angled.png",
  "/uploads/products/taprater-stands/realtor-com/realtor-com-standard-angled.png": "/uploads/products/taprater-stands/realtor-com/realtor-com-custom-angled.png",
  "/uploads/products/taprater-stands/snapchat-follow/snapchat-follow-standard-angled.png": "/uploads/products/taprater-stands/snapchat-follow/snapchat-follow-custom-angled.png",
  "/uploads/products/taprater-stands/social-media/social-media-standard-angled.png": "/uploads/products/taprater-stands/social-media/social-media-custom-angled.png",
  "/uploads/products/taprater-stands/styleseat/styleseat-standard-angled.png": "/uploads/products/taprater-stands/styleseat/styleseat-custom-angled.png",
  "/uploads/products/taprater-stands/taskrabbit/taskrabbit-standard-angled.png": "/uploads/products/taprater-stands/taskrabbit/taskrabbit-custom-angled.png",
  "/uploads/products/taprater-stands/thumbtack/thumbtack-standard-angled.png": "/uploads/products/taprater-stands/thumbtack/thumbtack-custom-angled.png",
  "/uploads/products/taprater-stands/tiktok-follow/tiktok-follow-standard-angled.png": "/uploads/products/taprater-stands/tiktok-follow/tiktok-follow-custom-angled.png",
  "/uploads/products/taprater-stands/tripadvisor/tripadvisor-standard-angled.png": "/uploads/products/taprater-stands/tripadvisor/tripadvisor-custom-angled.png",
  "/uploads/products/taprater-stands/trulia/trulia-standard-angled.png": "/uploads/products/taprater-stands/trulia/trulia-custom-angled.png",
  "/uploads/products/taprater-stands/uber-eats/uber-eats-standard-angled.png": "/uploads/products/taprater-stands/uber-eats/uber-eats-custom-angled.png",
  "/uploads/products/taprater-stands/vagaro/vagaro-standard-angled.png": "/uploads/products/taprater-stands/vagaro/vagaro-custom-angled.png",
  "/uploads/products/taprater-stands/vitals/vitals-standard-angled.png": "/uploads/products/taprater-stands/vitals/vitals-custom-angled.png",
  "/uploads/products/taprater-stands/vrbo/vrbo-standard-angled.png": "/uploads/products/taprater-stands/vrbo/vrbo-custom-angled.png",
  "/uploads/products/taprater-stands/x-follow/x-follow-standard-angled.png": "/uploads/products/taprater-stands/x-follow/x-follow-custom-angled.png",
  "/uploads/products/taprater-stands/yelp/yelp-standard-angled.png": "/uploads/products/taprater-stands/yelp/yelp-custom-angled.png",
  "/uploads/products/taprater-stands/youtube-follow/youtube-follow-standard-angled.png": "/uploads/products/taprater-stands/youtube-follow/youtube-follow-custom-angled.png",
  "/uploads/products/taprater-stands/zillow/zillow-standard-angled.png": "/uploads/products/taprater-stands/zillow/zillow-custom-angled.png",
  "/uploads/products/taprater-stands/zocdoc/zocdoc-standard-angled.png": "/uploads/products/taprater-stands/zocdoc/zocdoc-custom-angled.png",
  "/uploads/products/book-next-visit-stand.png": "/uploads/products/taprater-text-stands/connect-with-us/connect-with-us-custom-angled.png",
  "/uploads/products/view-menu-stand.png": "/uploads/products/taprater-text-stands/menu-and-order/menu-and-order-custom-angled.png",
  "/uploads/products/rate-your-experience-stand.png": "/uploads/products/taprater-text-stands/rate-your-experience/rate-your-experience-custom-angled.png"
};

export function customOnlyPublicText(value: string): string {
  let result = retiredImages[value] ?? value;
  for (const [old, replacement] of retiredClaims) result = result.replaceAll(old, replacement);
  return result;
}

/** Preserve merchant layouts, flags and custom prose; migrate only known retired values. */
export function customOnlyPublicContent<T>(value: T): T {
  if (typeof value === "string") return customOnlyPublicText(value) as T;
  if (Array.isArray(value)) return value.map(customOnlyPublicContent) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, customOnlyPublicContent(item)])) as T;
  return value;
}
