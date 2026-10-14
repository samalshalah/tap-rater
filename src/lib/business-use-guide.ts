import { z } from "zod";
import type { MigratedProduct } from "@/data/migrated-products";

export const businessUseGuideSchema = z.object({
  headline: z.string().trim().max(160).default(""),
  introduction: z.string().trim().max(600).default(""),
  seoTitle: z.string().trim().max(180).optional(),
  seoDescription: z.string().trim().max(320).optional(),
  recommendationsTitle: z.string().trim().max(160).optional(),
  placementTitle: z.string().trim().max(160).optional(),
  placements: z.array(z.object({ title: z.string().trim().min(2).max(100), body: z.string().trim().min(2).max(800) })).max(6).optional(),
  howItWorksTitle: z.string().trim().max(160).optional(),
  steps: z.array(z.object({ title: z.string().trim().min(2).max(100), body: z.string().trim().min(2).max(800) })).max(5).optional(),
  faqTitle: z.string().trim().max(160).optional(),
  recommendations: z.array(z.object({
    productSlug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
    goal: z.string().trim().min(2).max(100),
    reason: z.string().trim().min(2).max(400),
    placement: z.string().trim().min(2).max(200)
  })).max(3).default([]),
  faqs: z.array(z.object({
    question: z.string().trim().min(2).max(200),
    answer: z.string().trim().min(2).max(1000)
  })).max(8).default([])
}).superRefine((guide, ctx) => {
  if (new Set(guide.recommendations.map((item) => item.productSlug)).size !== guide.recommendations.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose each recommended product only once.", path: ["recommendations"] });
  }
});

export type BusinessUseGuide = z.infer<typeof businessUseGuideSchema>;

export function defaultBusinessUseGuide(slug: string): BusinessUseGuide {
  if (slug !== "restaurant-food") return { headline: "", introduction: "", recommendations: [], faqs: [] };
  return {
    headline: "NFC & QR Stands for Restaurants",
    seoTitle: "NFC & QR Stands for Restaurants, Cafés & Takeaways",
    seoDescription: "Explore restaurant NFC stands for menus, Google reviews, and social profiles. Compare Standard and Branded + QR designs, placement tips, and setup options.",
    introduction: "Help guests reach your menu, Google review page, or social profile from the places they already pause. Tap Rater stands connect a physical table or counter to your existing online destination. Standard stands use NFC; Branded designs add your restaurant name, logo, and a printed QR code for guests who prefer scanning. Start with the action that matters most at your restaurant, café, or takeaway, then choose a design and the correct destination for your location.",
    recommendationsTitle: "Recommended Stands for Your Restaurant",
    placementTitle: "Where to Place Your Restaurant Stands",
    placements: [
      { title: "Tables and ordering counters", body: "Put a menu stand where guests can see it before ordering, with enough space to bring a phone close. Link to a mobile-friendly menu or ordering page. Check that dishes, prices, and availability are maintained by your existing provider so guests see the information they need." },
      { title: "Checkout and the host desk", body: "A Google Review stand fits beside checkout, where guests finish their visit. Make the option available to all guests without asking for a particular rating. Keep the stand visible without blocking payment equipment, and confirm that the link opens the review destination for this restaurant." },
      { title: "Pickup and waiting areas", body: "Use a social stand where guests wait for an order or table. Your Instagram profile can help them discover new dishes and events after their visit. Keep the invitation clear: a social stand opens your profile, and guests decide whether to follow. Avoid placing several competing stands together." }
    ],
    howItWorksTitle: "How Your Restaurant Stand Works",
    steps: [
      { title: "Choose the action and design", body: "Pick a stand for your menu, reviews, or social profile, then compare the available designs and current prices on its product page. Start with one destination at one counter before planning additional stands for the rest of your space." },
      { title: "Provide and check your link", body: "Supply the public destination for the correct restaurant location. Open it on a phone to check that it works for a guest who is not signed into your accounts. If you choose Branded, review your business details and approve the design before payment." },
      { title: "Place it and invite guests to connect", body: "Position your stand where it is easy to see and reach. Guests tap a compatible NFC phone, or scan the printed QR on a Branded stand. Test the finished setup yourself and show staff where the destination leads so they can answer questions." }
    ],
    faqTitle: "Restaurant Stand FAQs",
    recommendations: [
      { productSlug: "menu-and-order-stand", goal: "Open your menu & ordering page", reason: "Take guests straight to your existing mobile menu or ordering page. Orders and payments stay with your current provider.", placement: "On tables, at the ordering counter, or beside pickup." },
      { productSlug: "google-review-stand", goal: "Make your Google review page easy to find", reason: "Give guests a direct link to review the correct restaurant location after their visit. Guests choose whether to leave a review and what to write.", placement: "At checkout, where departing guests can reach it." },
      { productSlug: "instagram-follow-stand", goal: "Stay connected after the meal", reason: "Open your restaurant’s Instagram profile so guests can discover your latest dishes, updates, and upcoming events.", placement: "At the counter or pickup area, where guests pause." }
    ],
    faqs: [
      { question: "Which stand should my restaurant start with?", answer: "Choose the action guests ask about most. A menu stand helps guests find your menu or ordering page, while a Google Review stand opens your restaurant’s review destination. An Instagram stand suits sharing your latest dishes and updates. Match the first stand to the spot where you will place it." },
      { question: "Can guests scan a QR code instead of tapping?", answer: "Yes, when you choose a Branded + QR design. Standard stands use NFC only and do not include a printed QR code. Branded adds your business identity and a QR code alongside NFC, giving guests a choice of how to open your destination. Check the options on the product page." },
      { question: "Do restaurant stands need a monthly subscription?", answer: "A direct stand opens one destination and does not require a Tap Rater hosted subscription. Optional hosted Multi-Link has a separate monthly charge and provides an editable page with several destinations. Your existing menu, ordering, or reservation provider may have its own fees, separate from the physical stand." },
      { question: "Will it work with my existing menu or ordering website?", answer: "Use a public, mobile-friendly URL for your existing menu or ordering page. The stand opens that link; your provider continues to handle menu content, orders, payments, and reservations. Test the link as a guest before ordering and avoid temporary session links or pages that require your staff login." },
      { question: "Can different restaurant locations use different links?", answer: "Yes. Supply the correct destination for each stand when configuring your order. Check that each menu, ordering page, and Google review link belongs to the intended location. For multiple tables or counters, compare stand bundles and keep a record of which destination is assigned to each stand." }
    ]
  };
}

export function orderBusinessUseProducts(products: MigratedProduct[], slug: string, assignedSlugs: string[]) {
  const assigned = new Map(assignedSlugs.map((value, index) => [value, index]));
  return products.filter((product) => assigned.has(product.slug) || product.businessUseSlugs?.includes(slug))
    .sort((a, b) => (assigned.get(a.slug) ?? Number.MAX_SAFE_INTEGER) - (assigned.get(b.slug) ?? Number.MAX_SAFE_INTEGER));
}

export function resolveRecommendations(guide: BusinessUseGuide, products: MigratedProduct[]) {
  return guide.recommendations.flatMap((item) => {
    const product = products.find((candidate) => candidate.slug === item.productSlug);
    return product ? [{ ...item, product }] : [];
  });
}
