import { unstable_noStore as noStore } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { multiLinkDemoImage } from "@/lib/marketing-images";
import { hostedMultiLinkServiceAddon } from "@/lib/service-addons";
import { formatPrice } from "@/lib/products";
import { cafeHeroImage, defaultHomepageShowcase, googleStandardImage, homepageShowcaseSchema, type HomepageShowcaseContent } from "@/lib/homepage-showcase";

const urlSchema = z
  .string()
  .trim()
  .min(1)
  .max(600)
  .refine((value) => value.startsWith("/") || value.startsWith("https://") || value.startsWith("http://"), "Use a relative or http(s) URL.");

const imageSchema = z.object({
  src: z.string().trim().min(1).max(1200),
  alt: z.string().trim().max(240).default("")
});

const linkSchema = z.object({
  label: z.string().trim().min(1).max(80),
  href: urlSchema,
  order: z.number().int().min(0).max(10000).default(0),
  enabled: z.boolean().default(true)
});

const ctaSchema = z.object({
  label: z.string().trim().min(1).max(80),
  href: urlSchema
});

export const headerNavigationSchema = z.object({
  items: z.array(linkSchema).max(12)
});

export const footerContentSchema = z.object({
  intro: z.string().trim().max(500).default("NFC tabletop stands for local businesses. Standard is NFC-only; Branded adds printed QR, your logo, and business name."),
  columns: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(80),
        order: z.number().int().min(0).max(10000).default(0),
        links: z.array(linkSchema).max(12)
      })
    )
    .max(6)
});

export const faqContentSchema = z.object({
  items: z
    .array(
      z.object({
        question: z.string().trim().min(4).max(240),
        answer: z.string().trim().min(4).max(1200),
        area: z.enum(["global", "product", "multilink", "shipping"]).default("global"),
        order: z.number().int().min(0).max(10000).default(0),
        enabled: z.boolean().default(true)
      })
    )
    .max(80)
});

export const homepageHeroSchema = z.object({
  enabled: z.boolean().default(true),
  eyebrow: z.string().trim().min(1).max(120),
  headline: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(520),
  primaryCta: ctaSchema,
  secondaryCta: ctaSchema.optional(),
  proofPoints: z.array(z.string().trim().min(1).max(80)).max(4).default([]),
  image: imageSchema
});

export const homepageActionsSchema = z.object({
  enabled: z.boolean().default(true),
  eyebrow: z.string().trim().max(120).default("Shop by action"),
  headline: z.string().trim().max(180).default("Start with the customer action."),
  items: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().max(300).default(""),
        href: urlSchema,
        image: imageSchema,
        order: z.number().int().min(0).max(10000).default(0),
        enabled: z.boolean().default(true)
      })
    )
    .max(8)
});

export const homepageFeaturedUsesSchema = z.object({
  enabled: z.boolean().default(true),
  eyebrow: z.string().trim().max(120).default("Shop by use"),
  headline: z.string().trim().max(180).default("Solutions for every business."),
  businessUseSlugs: z.array(z.string().trim().min(1).max(120)).max(12).default([])
});

export const homepageMarketingBlockSchema = z.object({
  enabled: z.boolean().default(true),
  eyebrow: z.string().trim().max(120).default(""),
  headline: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1).max(700),
  cta: ctaSchema,
  image: imageSchema,
  bullets: z.array(z.string().trim().min(1).max(90)).max(8).default([])
});

export const homepageHowItWorksSchema = z.object({
  enabled: z.boolean().default(true),
  eyebrow: z.string().trim().max(120).default("How it works"),
  headline: z.string().trim().max(180).default("From link to counter in three steps."),
  steps: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(100),
        description: z.string().trim().max(260).default(""),
        icon: z.enum(["shop", "link", "truck"]).default("shop"),
        order: z.number().int().min(0).max(10000).default(0)
      })
    )
    .max(6)
});

export const homepageFinalCtaSchema = z.object({
  enabled: z.boolean().default(true),
  eyebrow: z.string().trim().max(120).default("Ready when you are"),
  headline: z.string().trim().min(1).max(180),
  primaryCta: ctaSchema,
  secondaryCta: ctaSchema.optional()
});

export type WebsiteLink = { label: string; href: string; order: number; enabled: boolean };
export type WebsiteImage = { src: string; alt: string };
export type WebsiteCta = { label: string; href: string };
export type HeaderNavigationContent = { items: WebsiteLink[] };
export type FooterContent = { intro: string; columns: Array<{ label: string; order: number; links: WebsiteLink[] }> };
export type FaqContent = {
  items: Array<{
    question: string;
    answer: string;
    area: "global" | "product" | "multilink" | "shipping";
    order: number;
    enabled: boolean;
  }>;
};
export type HomepageHeroContent = {
  enabled: boolean;
  eyebrow: string;
  headline: string;
  body: string;
  primaryCta: WebsiteCta;
  secondaryCta?: WebsiteCta;
  proofPoints: string[];
  image: WebsiteImage;
};
export type HomepageActionsContent = {
  enabled: boolean;
  eyebrow: string;
  headline: string;
  items: Array<{ title: string; description: string; href: string; image: WebsiteImage; order: number; enabled: boolean }>;
};
export type HomepageFeaturedUsesContent = { enabled: boolean; eyebrow: string; headline: string; businessUseSlugs: string[] };
export type HomepageMarketingBlockContent = {
  enabled: boolean;
  eyebrow: string;
  headline: string;
  body: string;
  cta: WebsiteCta;
  image: WebsiteImage;
  bullets: string[];
};
export type HomepageHowItWorksContent = {
  enabled: boolean;
  eyebrow: string;
  headline: string;
  steps: Array<{ title: string; description: string; icon: "shop" | "link" | "truck"; order: number }>;
};
export type HomepageFinalCtaContent = { enabled: boolean; eyebrow: string; headline: string; primaryCta: WebsiteCta; secondaryCta?: WebsiteCta };

export type HomepageThemeContent = {
  showcase: HomepageShowcaseContent;
  hero: HomepageHeroContent;
  actions: HomepageActionsContent;
  featuredUses: HomepageFeaturedUsesContent;
  multilink: HomepageMarketingBlockContent;
  howItWorks: HomepageHowItWorksContent;
  customBranding: HomepageMarketingBlockContent;
  finalCta: HomepageFinalCtaContent;
  faqs: FaqContent;
};

type SiteContentClient = {
  from: (table: string) => {
    select: (columns?: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: <T = { payload?: unknown }>() => PromiseLike<{ data: T | null; error: null | { message: string } }>;
      };
    };
    upsert: (values: Record<string, unknown>, options?: Record<string, unknown>) => PromiseLike<{ error: null | { message: string } }>;
  };
};

export const defaultHeaderNavigation: HeaderNavigationContent = {
  items: [
    { label: "Home", href: "/", order: 5, enabled: true },
    { label: "Shop", href: "/shop", order: 10, enabled: true },
    { label: "Shop by Type", href: "/shop#stand-categories", order: 15, enabled: true },
    { label: "By Use", href: "/solutions", order: 20, enabled: true },
    { label: "How It Works", href: "/how-it-works", order: 30, enabled: true },
    { label: "Multi-Link", href: "/multi-link", order: 40, enabled: true },
    { label: "Resources", href: "/support", order: 60, enabled: true }
  ]
};

export const defaultFooterContent: FooterContent = {
  intro: "NFC tabletop stands for reviews, menus, booking, social media, feedback, and custom business links. Standard is NFC-only; Branded adds printed QR, your logo, and business name.",
  columns: [
    {
      label: "Shop",
      order: 10,
      links: [
        { label: "All Stands", href: "/shop", order: 10, enabled: true },
        { label: "Review Stands", href: "/category/reviews", order: 20, enabled: true },
        { label: "Menu Stands", href: "/category/menu", order: 30, enabled: true },
        { label: "Multi-Link Stand", href: "/category/website-link-stands", order: 40, enabled: true },
        { label: "Multi-Link", href: "/multi-link", order: 50, enabled: true }
      ]
    },
    {
      label: "Solutions",
      order: 20,
      links: [
        { label: "Automotive", href: "/solutions/automotive", order: 10, enabled: true },
        { label: "Restaurants", href: "/solutions/restaurant-food", order: 20, enabled: true },
        { label: "Healthcare", href: "/solutions/healthcare-dental", order: 30, enabled: true },
        { label: "Beauty & Wellness", href: "/solutions/beauty-salon-wellness", order: 40, enabled: true }
      ]
    },
    {
      label: "Resources",
      order: 30,
      links: [
        { label: "How It Works", href: "/how-it-works", order: 10, enabled: true },
        { label: "FAQ", href: "/faqs", order: 20, enabled: true },
        { label: "Support", href: "/support", order: 30, enabled: true },
        { label: "Contact", href: "/contact-us", order: 40, enabled: true }
      ]
    },
    {
      label: "Company",
      order: 40,
      links: [
        { label: "Terms", href: "/terms", order: 10, enabled: true },
        { label: "Privacy", href: "/privacy-policy", order: 20, enabled: true },
        { label: "Refund Policy", href: "/refund-policy", order: 30, enabled: true },
        { label: "Shipping", href: "/shipping", order: 40, enabled: true }
      ]
    }
  ]
};

export const defaultFaqContent: FaqContent = {
  items: [
    {
      question: "What can a Tap Rater stand open?",
      answer: "A Standard Direct stand opens one customer-provided destination URL by NFC tap, with no printed QR. That can be a review page, menu, booking page, survey, social profile, website, or custom URL. Branded adds a QR code generated from your destination, your logo, and business name.",
      area: "global",
      order: 10,
      enabled: true
    },
    {
      question: "Do Standard Direct stands require an account or subscription?",
      answer: "No. Standard Direct sends NFC taps directly to your provided URL and does not require a Tap Rater account, hosted redirect, activation, or subscription.",
      area: "global",
      order: 20,
      enabled: true
    },
    {
      question: "Can I add my logo or business name?",
      answer: "Branded stands include your logo, business name, and a QR code generated from your destination. Approve the artwork preview before payment. Final print artwork is generated after payment.",
      area: "global",
      order: 30,
      enabled: true
    },
    {
      question: "Where should I place the stand?",
      answer: "Place it where customers finish a useful interaction: checkout, front desk, pickup counter, table service, reception, or service desk.",
      area: "global",
      order: 40,
      enabled: true
    },
    {
      question: "Will it work with my customer's phone?",
      answer: "NFC tapping requires a compatible phone with NFC available. Hold the phone's NFC area near the stand and open the link notification. Antenna position and settings vary by phone. Branded stands also include a printed QR code. The destination may require its own app or sign-in.",
      area: "global", order: 50, enabled: true
    },
    {
      question: "How much is shipping?",
      answer: "Standard shipping is $12 for orders under $55 and free for orders of $55 or more. Shipping and applicable tax are shown before payment. Preparation and delivery estimates are not yet confirmed; contact us before ordering for a deadline.",
      area: "global", order: 60, enabled: true
    },
    {
      question: "How is my stand set up?",
      answer: "Add the destination URL when you order. Tap Rater prepares the stand for that link. Direct stands do not need a Tap Rater account or activation. Optional Multi-Link includes account setup so you can manage your hosted page after payment.",
      area: "global", order: 70, enabled: true
    }
  ]
};

export const defaultHomepageContent: HomepageThemeContent = {
  showcase: defaultHomepageShowcase,
  hero: {
    enabled: true,
    eyebrow: "NFC Business Stands",
    headline: "Tap Rater NFC Business Stands.",
    body: "Put reviews, menus, bookings, and social follows one tap away. A small stand for the moments your customers are ready to connect.",
    primaryCta: { label: "Shop Stands", href: "/shop" },
    secondaryCta: { label: "Customize Yours", href: "/custom-stands" },
    proofPoints: ["Direct stands: no subscription", "Branded: preview before payment"],
    image: { src: cafeHeroImage, alt: "Illustrative cafe scene with a Tap Rater Google Review stand and a phone showing a review form" }
  },
  actions: {
    enabled: true,
    eyebrow: "Shop by action",
    headline: "What would you like customers to do?",
    items: [
      {
        title: "Leave a review",
        description: "Open your review page.",
        href: "/category/reviews",
        image: { src: googleStandardImage, alt: "Google Review stand" },
        order: 10,
        enabled: true
      },
      {
        title: "View a menu",
        description: "Share your menu or ordering link.",
        href: "/category/menu",
        image: { src: "/uploads/products/taprater-text-stands/menu-and-order/menu-and-order-standard-angled.png", alt: "Menu and Order stand" },
        order: 20,
        enabled: true
      },
      {
        title: "Book an appointment",
        description: "Connect to your booking page.",
        href: "/product/connect-with-us-stand",
        image: { src: "/uploads/products/taprater-text-stands/connect-with-us/connect-with-us-standard-angled.png", alt: "Connect With Us stand for a booking link" },
        order: 30,
        enabled: true
      },
      {
        title: "Follow on social",
        description: "Make your social profile easy to find.",
        href: "/category/social-media",
        image: { src: "/uploads/products/taprater-text-stands/follow-us-on-social-media/follow-us-on-social-media-standard-angled.png", alt: "Follow Us on Social Media stand" },
        order: 40,
        enabled: true
      },
      {
        title: "Share feedback",
        description: "Hear about the customer experience.",
        href: "/product/rate-your-experience-stand",
        image: { src: "/uploads/products/taprater-text-stands/rate-your-experience/rate-your-experience-standard-angled.png", alt: "Rate Your Experience stand" },
        order: 50,
        enabled: true
      }
    ]
  },
  featuredUses: {
    enabled: true,
    eyebrow: "In your business",
    headline: "At the moments that matter.",
    businessUseSlugs: defaultHomepageShowcase.scenes.map((scene) => scene.slug)
  },
  multilink: {
    enabled: true,
    eyebrow: "Optional Multi-Link",
    headline: `One stand. Up to ${hostedMultiLinkServiceAddon.maxLinks} links.`,
    body: `Add an editable hosted page to a compatible stand for ${formatPrice(hostedMultiLinkServiceAddon.monthlyPriceCents)}/month per page, plus the physical stand price. Standard is NFC-only; Branded adds printed QR.`,
    cta: { label: "Explore Multi-Link", href: "/multi-link" },
    image: multiLinkDemoImage,
    bullets: ["Reviews", "Appointments", "Menu", "Social Media", "Website", "Contact"]
  },
  howItWorks: {
    enabled: true,
    eyebrow: "The customer experience",
    headline: "One tap opens your link.",
    steps: [
      { title: "Hold your phone near the stand", description: "Bring an NFC-compatible phone close to the contactless area.", icon: "shop", order: 10 },
      { title: "Open the notification", description: "Tap the link notification on your phone to open the destination.", icon: "link", order: 20 },
      { title: "Choose your next action", description: "Read the menu, book, follow, or write a review. Nothing is submitted automatically.", icon: "truck", order: 30 }
    ]
  },
  customBranding: {
    enabled: true,
    eyebrow: "Custom Branding",
    headline: "Standard or Branded?",
    body: "Add your business name, logo, and destination-generated QR with Branded. Approve the artwork preview before payment. Final print artwork is generated after payment.",
    cta: { label: "Shop Branded Stands", href: "/custom-stands" },
    image: { src: "/uploads/products/branded-demo-river-cafe-stand.png", alt: "Finished River Cafe branded Tap Rater stand demo with logo and QR code" },
    bullets: ["Your logo", "Your business", "Your destination", "Approve preview before payment"]
  },
  finalCta: {
    enabled: true,
    eyebrow: "Ready when you are",
    headline: "Find the stand for your business.",
    primaryCta: { label: "Shop Stands", href: "/shop" },
    secondaryCta: { label: "Custom or bulk orders? Let's talk", href: "/contact-us" }
  },
  faqs: defaultFaqContent
};

export async function getHeaderNavigationContent() {
  return readContent("navigation.header", "section", headerNavigationSchema, defaultHeaderNavigation) as Promise<HeaderNavigationContent>;
}

export async function getFooterContent() {
  const content = await readContent("navigation.footer", "section", footerContentSchema, defaultFooterContent) as FooterContent;
  return { ...content, intro: correctKnownWebsiteClaim("navigation.footer.intro", content.intro) };
}

export async function getFaqContent() {
  const content = await readContent("faqs.global", "section", faqContentSchema, defaultFaqContent) as FaqContent;
  return { ...content, items: content.items.map((item) => ({
    ...item,
    answer: correctKnownWebsiteClaim("faqs.global.answer", item.answer)
  })) };
}

export async function getHomepageThemeContent(): Promise<HomepageThemeContent> {
  const [hero, actions, featuredUses, multilink, howItWorks, customBranding, finalCta, faqs, storedShowcase] = await Promise.all([
    readContent("homepage.hero", "homepage", homepageHeroSchema, defaultHomepageContent.hero) as Promise<HomepageHeroContent>,
    readContent("homepage.actions", "homepage", homepageActionsSchema, defaultHomepageContent.actions) as Promise<HomepageActionsContent>,
    readContent("homepage.featured_uses", "homepage", homepageFeaturedUsesSchema, defaultHomepageContent.featuredUses) as Promise<HomepageFeaturedUsesContent>,
    readContent("homepage.multilink", "homepage", homepageMarketingBlockSchema, defaultHomepageContent.multilink) as Promise<HomepageMarketingBlockContent>,
    readContent("homepage.how_it_works", "homepage", homepageHowItWorksSchema, defaultHomepageContent.howItWorks) as Promise<HomepageHowItWorksContent>,
    readContent("homepage.custom_branding", "homepage", homepageMarketingBlockSchema, defaultHomepageContent.customBranding) as Promise<HomepageMarketingBlockContent>,
    readContent("homepage.final_cta", "homepage", homepageFinalCtaSchema, defaultHomepageContent.finalCta) as Promise<HomepageFinalCtaContent>,
    getFaqContent(),
    readContent("homepage.showcase", "homepage", homepageShowcaseSchema.nullable(), null) as Promise<HomepageShowcaseContent | null>
  ]);

  // Refresh only the old built-in content until the merchant saves the new editor.
  const initialLayout = storedShowcase === null;
  const legacyQuestions = defaultFaqContent.items.slice(0, 4).map((item) => item.question);
  const homepageFaqs = initialLayout && faqs.items.length === 4 && faqs.items.every((item) => legacyQuestions.includes(item.question))
    ? { items: [...faqs.items, ...defaultFaqContent.items.slice(4)] } : faqs;

  return {
    showcase: storedShowcase ?? defaultHomepageShowcase,
    hero: {
      ...hero,
      headline: initialLayout && hero.headline === "Turn Every Tap Into Action." ? defaultHomepageContent.hero.headline : hero.headline,
      image: initialLayout && ["/uploads/products/taprater-stands/yelp/yelp-standard-angled.png", "/uploads/products/rate-your-experience-stand.png"].includes(hero.image.src) ? defaultHomepageContent.hero.image : hero.image,
      secondaryCta: initialLayout && hero.secondaryCta?.label === "See How It Works" && hero.secondaryCta.href === "/how-it-works" ? defaultHomepageContent.hero.secondaryCta : hero.secondaryCta,
      eyebrow: correctKnownWebsiteClaim("homepage.hero.eyebrow", hero.eyebrow),
      body: correctKnownWebsiteClaim("homepage.hero.body", hero.body),
      proofPoints: initialLayout && ["NFC Ready|No App Needed|Works Instantly", "NFC + QR Ready|No App Needed|Works Instantly"].includes(hero.proofPoints.join("|"))
        ? defaultHomepageContent.hero.proofPoints : hero.proofPoints.map((point) => correctKnownWebsiteClaim("homepage.hero.proofPoints", point))
    },
    actions: initialLayout && actions.headline === "Start with the customer action." && actions.items.length === 4 && actions.items.every((item) => ["Get Reviews", "Book Appointments", "Collect Feedback", "View a Menu"].includes(item.title) && item.enabled)
      ? { ...defaultHomepageContent.actions, enabled: actions.enabled } : actions,
    featuredUses: {
      ...featuredUses,
      eyebrow: initialLayout && featuredUses.eyebrow === "Shop by use" ? defaultHomepageContent.featuredUses.eyebrow : featuredUses.eyebrow,
      headline: initialLayout && featuredUses.headline === "Solutions for every business." ? defaultHomepageContent.featuredUses.headline : featuredUses.headline
    },
    multilink: { ...multilink, eyebrow: initialLayout && multilink.eyebrow === "Multi-Link" ? defaultHomepageContent.multilink.eyebrow : multilink.eyebrow },
    howItWorks: initialLayout && howItWorks.headline === "Choose it. Link it. Put it to work." && ["Choose Your Stand|Add Your Link / Branding|We Prepare & Ship", "Choose Your Stand|Add Your Link / Branding|We Print & Ship"].includes(howItWorks.steps.map((step) => step.title).join("|"))
      ? { ...defaultHomepageContent.howItWorks, enabled: howItWorks.enabled } : howItWorks,
    customBranding: {
      ...customBranding,
      headline: initialLayout && customBranding.headline === "Make It Yours." ? defaultHomepageContent.customBranding.headline : customBranding.headline,
      body: correctKnownWebsiteClaim("homepage.custom_branding.body", customBranding.body),
      bullets: customBranding.bullets.map((bullet) => correctKnownWebsiteClaim("homepage.custom_branding.bullets", bullet))
    },
    finalCta: {
      ...finalCta,
      headline: initialLayout && finalCta.headline === "Ready to Put Tap Rater to Work?" ? defaultHomepageContent.finalCta.headline : finalCta.headline,
      primaryCta: initialLayout && finalCta.primaryCta.label === "Shop All Stands" && finalCta.primaryCta.href === "/shop" ? defaultHomepageContent.finalCta.primaryCta : finalCta.primaryCta,
      secondaryCta: initialLayout && finalCta.secondaryCta?.label === "Shop by Use" && finalCta.secondaryCta.href === "/solutions" ? defaultHomepageContent.finalCta.secondaryCta : finalCta.secondaryCta
    }, faqs: homepageFaqs
  };
}

export async function saveWebsiteContentRecord(key: string, type: "homepage" | "section" | "page" | "seo", payload: unknown) {
  if (!hasSupabaseAdminConfig()) {
    throw new Error("Database persistence is not configured.");
  }

  const { error } = await (getSupabaseAdmin() as SiteContentClient).from("site_content").upsert(
    {
      key,
      type,
      status: "published",
      payload,
      updated_at: new Date().toISOString()
    },
    { onConflict: "key" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function readContent<T>(key: string, type: "homepage" | "section" | "page" | "seo", schema: z.ZodType<T>, fallback: T): Promise<T> {
  noStore();

  if (!hasSupabaseAdminConfig()) {
    return fallback;
  }

  try {
    const result = await (getSupabaseAdmin() as SiteContentClient)
      .from("site_content")
      .select("payload")
      .eq("key", key)
      .maybeSingle<{ payload?: unknown }>();

    const parsed = schema.safeParse(result.data?.payload);
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export function orderedEnabledLinks(items: HeaderNavigationContent["items"]) {
  return items.filter((item) => item.enabled).sort((first, second) => first.order - second.order || first.label.localeCompare(second.label));
}

export function orderedEnabledFaqs(content: FaqContent, area?: FaqContent["items"][number]["area"]) {
  return content.items
    .filter((item) => item.enabled && (!area || item.area === area || item.area === "global"))
    .sort((first, second) => first.order - second.order || first.question.localeCompare(second.question));
}

// Exact field/value corrections for previously published defaults, not a prose sanitizer.
const knownWebsiteClaims: Record<string, ReadonlyMap<string, string>> = {
  "navigation.footer.intro": new Map([
    ["Custom NFC and QR tabletop stands for local businesses.", defaultFooterContent.intro],
    ["Custom NFC and QR tabletop stands for reviews, menus, booking, social media, feedback, and custom business links.", defaultFooterContent.intro],
    ["Custom printed NFC and QR tabletop stands for reviews, menus, booking, social media, feedback, and custom business links.", defaultFooterContent.intro],
    ["Custom NFC and QR tabletop stands for reviews, menus, booking, social media, feedback, and business links.", defaultFooterContent.intro]
  ].map(([from, to]) => [from.toLowerCase(), to])),
  "faqs.global.answer": new Map([
    ["A Standard Direct stand opens one customer-provided destination URL by QR code and NFC tap. That can be a review page, menu, booking page, survey, social profile, website, or custom URL.", defaultFaqContent.items[0].answer],
    ["A Standard Direct stand opens one customer-provided destination URL by NFC tap. That can be a review page, menu, booking page, survey, social profile, website, or custom URL.", defaultFaqContent.items[0].answer],
    ["No. Standard Direct sends QR and NFC directly to your provided URL and does not require a Tap Rater account, hosted redirect, activation, or subscription.", defaultFaqContent.items[1].answer],
    ["Products that support Branded setup let you add approved business details, upload a logo where supported, preview the proof, and approve it before adding to cart.", defaultFaqContent.items[2].answer]
  ].map(([from, to]) => [from.toLowerCase(), to])),
  "homepage.hero.eyebrow": new Map([["nfc + qr business stands", defaultHomepageContent.hero.eyebrow]]),
  "homepage.hero.body": new Map([
    ["Tap Rater stands help customers review, book, follow, view menus, and visit your links with one tap or scan.".toLowerCase(), defaultHomepageContent.hero.body]
  ]),
  "homepage.hero.proofPoints": new Map([["nfc + qr ready", "NFC Ready"]]),
  "homepage.custom_branding.body": new Map([
    ["Add your business name, logo where supported, and destination. Preview your stand before ordering.", defaultHomepageContent.customBranding.body],
    ["Add your business name, logo where supported, and destination. Preview your stand before ordering so you know what will be printed.", defaultHomepageContent.customBranding.body],
    ["Add your business name, logo where supported, and destination. Preview your stand before ordering so you know what will be.", defaultHomepageContent.customBranding.body]
  ].map(([from, to]) => [from.toLowerCase(), to])),
  "homepage.custom_branding.bullets": new Map([["preview before ordering", "Approve preview before payment"]])
};

function correctKnownWebsiteClaim(field: string, value: string): string {
  return knownWebsiteClaims[field]?.get(value.toLowerCase()) ?? value;
}
