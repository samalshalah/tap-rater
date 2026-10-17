import { z } from "zod";
import type { MigratedProduct } from "@/data/migrated-products";
import { industryBusinessGuides } from "@/lib/business-use-industry-guides";

export const businessUseGuideSchema = z.object({
  headline: z.string().trim().max(160).default(""),
  introduction: z.string().trim().max(600).default(""),
  seoTitle: z.string().trim().max(180).optional(),
  seoDescription: z.string().trim().max(320).optional(),
  recommendationsTitle: z.string().trim().max(160).optional(),
  placementTitle: z.string().trim().max(160).optional(),
  placements: z.array(z.object({
    title: z.string().trim().min(2).max(100),
    body: z.string().trim().min(2).max(800),
    productSlug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/).optional()
  })).max(6).optional(),
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
  if (slug !== "restaurant-food") return industryBusinessGuides[slug] ?? { headline: "", introduction: "", recommendations: [], faqs: [] };
  return {
    headline: "NFC & QR Stands for Restaurants",
    seoTitle: "NFC & QR Stands for Restaurants, Cafés & Takeaways",
    seoDescription: "Explore restaurant NFC stands for menus, Google reviews, and social profiles. Compare Standard and Branded + QR designs, placement tips, and setup options.",
    introduction: "Help guests reach your menu, Google review page, or social profile from the places they already pause. Tap Rater stands connect a physical table or counter to your existing online destination. Standard stands use NFC; Branded designs add your restaurant name, logo, and a printed QR code for guests who prefer scanning. Start with the action that matters most at your restaurant, café, or takeaway, then choose a design and the correct destination for your location.",
    recommendationsTitle: "Recommended Stands for Your Restaurant",
    placementTitle: "Where to Place Your Restaurant Stands",
    placements: [
      { title: "Tables and ordering counters", productSlug: "menu-and-order-stand", body: "Let diners open your current menu before they order, whether they are seated at a table or waiting at a café counter. Use the public menu or ordering URL for that location. Your existing provider continues to handle menu updates, orders, and payments." },
      { title: "Checkout and the host desk", productSlug: "google-review-stand", body: "Make your restaurant’s Google review page easy to reach as guests finish their meal. Place the stand beside checkout or the host desk, with space away from the payment terminal. Invite honest feedback from all guests and check that the destination belongs to this restaurant location." },
      { title: "Pickup and waiting areas", productSlug: "instagram-follow-stand", body: "Give guests waiting for takeaway orders a way to discover new dishes, daily specials, and upcoming events on your restaurant’s Instagram profile. Position the stand beside pickup signage where phones can reach it. Opening the profile leaves the decision to follow with the guest." }
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
