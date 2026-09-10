import { z } from "zod";
import type { MigratedProduct } from "@/data/migrated-products";
import { getProductPurchaseOptions } from "@/lib/purchase-options";

const mediaUrl = z.string().trim().max(1200).refine(
  (value) => !value || (value.startsWith("/") && !value.startsWith("//")) || value.startsWith("https://"),
  "Use a local path or HTTPS URL."
);
const image = z.object({ src: mediaUrl, alt: z.string().trim().max(240), caption: z.string().trim().max(240).default("") });

export const homepageShowcaseSchema = z.object({
  featuredEnabled: z.boolean().default(true),
  featuredHeadline: z.string().trim().min(1).max(180),
  featuredProductSlugs: z.array(z.string().trim().min(1).max(120)).max(5),
  heroCaption: z.string().trim().max(240).default(""),
  comparisonProductSlug: z.string().trim().max(120),
  comparisonStandard: image.extend({ src: mediaUrl.refine(Boolean, "Add a Standard comparison image.") }),
  comparisonBranded: image.extend({ src: mediaUrl.refine(Boolean, "Add a Branded comparison image.") }),
  tapVideoUrl: mediaUrl.default(""),
  tapPosterUrl: mediaUrl.default(""),
  tapCaptionsUrl: mediaUrl.default(""),
  tapTranscript: z.string().trim().max(4000).default(""),
  scenes: z.array(z.object({
    slug: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().max(240),
    image,
    productSlug: z.string().trim().max(120)
  })).max(5),
  qualityEnabled: z.boolean().default(true),
  qualityHeadline: z.string().trim().min(1).max(180),
  qualityImage: image
});

export type HomepageShowcaseContent = z.infer<typeof homepageShowcaseSchema>;

export const googleStandardImage = "/uploads/products/taprater-stands/google/google-standard-angled.png";
export const cafeHeroImage = "/uploads/marketing/homepage-cafe-review-illustration.png";

export const defaultHomepageShowcase: HomepageShowcaseContent = {
  featuredEnabled: true,
  featuredHeadline: "Featured stands",
  featuredProductSlugs: ["google-review-stand", "yelp-review-stand", "facebook-review-stand", "rate-your-experience-stand", "follow-us-social-media-stand"],
  heroCaption: "AI-edited product illustration",
  comparisonProductSlug: "google-review-stand",
  comparisonStandard: { src: googleStandardImage, alt: "Standard Google Review stand, NFC only", caption: "Standard design" },
  comparisonBranded: { src: "/uploads/products/taprater-stands/google/google-custom-angled.png", alt: "Branded Google Review stand template with logo, business name and QR positions", caption: "Branded template; your artwork replaces the marked areas" },
  tapVideoUrl: "",
  tapPosterUrl: "",
  tapCaptionsUrl: "",
  tapTranscript: "",
  scenes: [
    { slug: "restaurant-food", title: "Restaurants & cafes", body: "A menu at the counter. A review after the visit.", image: { src: "", alt: "Menu and Order stand for a restaurant counter", caption: "Product example" }, productSlug: "menu-and-order-stand" },
    { slug: "beauty-salon-wellness", title: "Salons & wellness", body: "Put the next appointment one tap away.", image: { src: "", alt: "Connect With Us stand for a salon booking link", caption: "Product example" }, productSlug: "connect-with-us-stand" },
    { slug: "automotive", title: "Automotive", body: "Invite feedback at the end of a service visit.", image: { src: "", alt: "Rate Your Experience stand for an automotive service desk", caption: "Product example" }, productSlug: "rate-your-experience-stand" },
    { slug: "hotel-travel", title: "Hotels & travel", body: "Help guests connect with your social pages.", image: { src: "", alt: "Follow Us on Social Media stand for a hotel reception", caption: "Product example" }, productSlug: "follow-us-social-media-stand" },
    { slug: "healthcare-dental", title: "Healthcare & dental", body: "Invite patients to share their experience.", image: { src: "", alt: "Google Review stand for a healthcare or dental reception", caption: "Product example" }, productSlug: "google-review-stand" }
  ],
  qualityEnabled: true,
  qualityHeadline: "A small stand. A useful detail.",
  qualityImage: { src: googleStandardImage, alt: "Google Review acrylic stand and its countertop base", caption: "Product design shown" }
};

export function selectFeaturedHomepageProducts(products: MigratedProduct[], slugs: string[]) {
  return [...new Set(slugs)].flatMap((slug) => {
    const product = products.find((item) => item.slug === slug && item.isActive);
    return product && getProductPurchaseOptions(product).length ? [product] : [];
  }).slice(0, 5);
}
