export type BusinessGuide = {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  category: "Google reviews" | "Instagram";
  published: string;
  image: string;
  imageAlt: string;
  productHref: string;
  productName: string;
};

const googleImage = "/product-galleries/google-custom/tap-rater-custom-google-review-stand-01-white-background-angled.webp";
const instagramImage = "/product-galleries/custom-v3/instagram-follow-stand/01-white-background-angled.webp";

export const businessGuides: BusinessGuide[] = [
  {
    slug: "google-review-link-qr-code",
    title: "How to get your Google review link and create a QR code",
    seoTitle: "How to Get Your Google Review Link and QR Code",
    description: "Find your Google review link, save its QR code, and test the correct business location before sharing it online or on a custom review stand.",
    category: "Google reviews",
    published: "2026-11-27",
    image: googleImage,
    imageAlt: "Custom Tap Rater Google review stand with business logo, company name and QR code placeholders",
    productHref: "/product/google-review-stand",
    productName: "custom Google review stand"
  },
  {
    slug: "how-to-ask-for-google-reviews",
    title: "How to ask customers for Google reviews: six useful templates",
    seoTitle: "How to Ask for Google Reviews: 6 Templates",
    description: "Use six Google review request templates for checkout, email, text, and service visits. Learn when to ask and how to share your review link.",
    category: "Google reviews",
    published: "2026-11-27",
    image: googleImage,
    imageAlt: "Custom Google review stand with space for your logo and a matching review QR code",
    productHref: "/product/google-review-stand",
    productName: "custom Google review stand"
  },
  {
    slug: "get-more-google-reviews",
    title: "How to get more Google reviews for your business",
    seoTitle: "How to Get More Google Reviews for Your Business",
    description: "Build a practical Google review routine: check your link, choose when to ask, place your custom stand, and measure results without pressuring customers.",
    category: "Google reviews",
    published: "2026-11-27",
    image: googleImage,
    imageAlt: "Custom branded Google review stand with NFC tap and QR scan options on a white acrylic display",
    productHref: "/product/google-review-stand",
    productName: "custom Google review stand"
  },
  {
    slug: "instagram-qr-code-for-business",
    title: "How to get your Instagram QR code and use it at your business",
    seoTitle: "How to Get Your Instagram QR Code for Your Business",
    description: "Find your Instagram profile QR code, test it, and give customers a reason to follow. See how to use it with a custom branded Instagram stand.",
    category: "Instagram",
    published: "2026-11-27",
    image: instagramImage,
    imageAlt: "Custom Tap Rater Instagram follow stand with business logo, company name and QR code placeholders",
    productHref: "/product/instagram-follow-stand",
    productName: "custom Instagram follow stand"
  }
];

export function getBusinessGuide(slug: string) {
  return businessGuides.find((guide) => guide.slug === slug);
}

export function businessGuideHref(guide: Pick<BusinessGuide, "slug">) {
  return `/guides/${guide.slug}`;
}
