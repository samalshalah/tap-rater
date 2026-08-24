import { unstable_noStore as noStore } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";

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
  intro: z.string().trim().max(500).default("Custom printed NFC and QR tabletop stands for local businesses."),
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
    { label: "Multi-Link", href: "/category/website-link-stands", order: 40, enabled: true },
    { label: "Resources", href: "/support", order: 60, enabled: true }
  ]
};

export const defaultFooterContent: FooterContent = {
  intro: "Custom printed NFC and QR tabletop stands for reviews, menus, booking, social media, feedback, and custom business links.",
  columns: [
    {
      label: "Shop",
      order: 10,
      links: [
        { label: "All Stands", href: "/shop", order: 10, enabled: true },
        { label: "Review Stands", href: "/category/reviews", order: 20, enabled: true },
        { label: "Menu Stands", href: "/category/menu", order: 30, enabled: true },
        { label: "Multi-Link Stands", href: "/category/website-link-stands", order: 40, enabled: true }
      ]
    },
    {
      label: "Solutions",
      order: 20,
      links: [
        { label: "Automotive", href: "/solutions/auto-dealerships", order: 10, enabled: true },
        { label: "Restaurants", href: "/solutions/restaurants-cafes", order: 20, enabled: true },
        { label: "Healthcare", href: "/solutions/healthcare-dental", order: 30, enabled: true },
        { label: "Beauty & Wellness", href: "/solutions/beauty-wellness", order: 40, enabled: true }
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
      answer: "A Standard Direct stand opens one customer-provided destination URL by QR code and NFC tap. That can be a review page, menu, booking page, survey, social profile, website, or custom URL.",
      area: "global",
      order: 10,
      enabled: true
    },
    {
      question: "Do Standard Direct stands require an account or subscription?",
      answer: "No. Standard Direct sends QR and NFC directly to your provided URL and does not require a Tap Rater account, hosted redirect, activation, or subscription.",
      area: "global",
      order: 20,
      enabled: true
    },
    {
      question: "Can I add my logo or business name?",
      answer: "Products that support Branded setup let you add approved business details, upload a logo where supported, preview the proof, and approve it before adding to cart.",
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
    }
  ]
};

export const defaultHomepageContent: HomepageThemeContent = {
  hero: {
    enabled: true,
    eyebrow: "NFC + QR Business Stands",
    headline: "Turn Every Tap Into Action.",
    body: "Tap Rater stands help customers review, book, follow, view menus, and visit your links with one tap or scan.",
    primaryCta: { label: "Shop Stands", href: "/shop" },
    secondaryCta: { label: "See How It Works", href: "/how-it-works" },
    proofPoints: ["NFC + QR Ready", "No App Needed", "Works Instantly"],
    image: { src: "/uploads/products/google-review-stand.png", alt: "Google Review Tap Rater stand" }
  },
  actions: {
    enabled: true,
    eyebrow: "Shop by action",
    headline: "Start with the customer action.",
    items: [
      {
        title: "Get Reviews",
        description: "Send happy customers straight to the review page that matters.",
        href: "/category/reviews",
        image: { src: "/uploads/products/google-review-stand.png", alt: "Google Review Tap Rater stand" },
        order: 10,
        enabled: true
      },
      {
        title: "Book Appointments",
        description: "Open booking, reservations, scheduling, or next-visit links.",
        href: "/category/appointments",
        image: { src: "/uploads/products/book-next-visit-stand.png", alt: "Book Next Visit Tap Rater stand" },
        order: 20,
        enabled: true
      },
      {
        title: "Collect Feedback",
        description: "Make private feedback easy while the experience is fresh.",
        href: "/category/feedback",
        image: { src: "/uploads/products/rate-your-experience-stand.png", alt: "Rate Your Experience stand" },
        order: 30,
        enabled: true
      },
      {
        title: "View a Menu",
        description: "Put menus, ordering, and information one tap away.",
        href: "/category/menu",
        image: { src: "/uploads/products/view-menu-stand.png", alt: "View Our Menu Tap Rater stand" },
        order: 40,
        enabled: true
      }
    ]
  },
  featuredUses: {
    enabled: true,
    eyebrow: "Shop by use",
    headline: "Solutions for every business.",
    businessUseSlugs: ["auto-dealerships", "restaurants-cafes", "healthcare-dental", "beauty-wellness", "hotels-hospitality"]
  },
  multilink: {
    enabled: true,
    eyebrow: "Multi-Link",
    headline: "One Stand. Unlimited Possibilities.",
    body: "Create one branded page with reviews, appointments, menus, social media, your website, contact details, and more.",
    cta: { label: "Explore Multi-Link", href: "/category/website-link-stands" },
    image: { src: "/uploads/products/rate-your-experience-stand.png", alt: "Multi-Link Tap Rater stand" },
    bullets: ["Reviews", "Appointments", "Menu", "Social Media", "Website", "Contact"]
  },
  howItWorks: {
    enabled: true,
    eyebrow: "How it works",
    headline: "Choose it. Link it. Put it to work.",
    steps: [
      { title: "Choose Your Stand", description: "Pick the action, use case, or product style that fits your counter.", icon: "shop", order: 10 },
      { title: "Add Your Link / Branding", description: "Enter the destination and add approved branded details where supported.", icon: "link", order: 20 },
      { title: "We Print & Ship", description: "Your configured stand is prepared for production and fulfillment.", icon: "truck", order: 30 }
    ]
  },
  customBranding: {
    enabled: true,
    eyebrow: "Custom Branding",
    headline: "Make It Yours.",
    body: "Add your business name, logo where supported, and destination. Preview your stand before ordering so you know what will be printed.",
    cta: { label: "Shop Branded Stands", href: "/custom-stands" },
    image: { src: "/uploads/products/branded-demo-river-cafe-stand.png", alt: "Finished River Cafe branded Tap Rater stand demo with logo and QR code" },
    bullets: ["Your logo", "Your business", "Your destination", "Preview before ordering"]
  },
  finalCta: {
    enabled: true,
    eyebrow: "Ready when you are",
    headline: "Ready to Put Tap Rater to Work?",
    primaryCta: { label: "Shop All Stands", href: "/shop" },
    secondaryCta: { label: "Shop by Use", href: "/solutions" }
  },
  faqs: defaultFaqContent
};

export async function getHeaderNavigationContent() {
  return readContent("navigation.header", "section", headerNavigationSchema, defaultHeaderNavigation) as Promise<HeaderNavigationContent>;
}

export async function getFooterContent() {
  return readContent("navigation.footer", "section", footerContentSchema, defaultFooterContent) as Promise<FooterContent>;
}

export async function getFaqContent() {
  return readContent("faqs.global", "section", faqContentSchema, defaultFaqContent) as Promise<FaqContent>;
}

export async function getHomepageThemeContent(): Promise<HomepageThemeContent> {
  const [hero, actions, featuredUses, multilink, howItWorks, customBranding, finalCta, faqs] = await Promise.all([
    readContent("homepage.hero", "homepage", homepageHeroSchema, defaultHomepageContent.hero) as Promise<HomepageHeroContent>,
    readContent("homepage.actions", "homepage", homepageActionsSchema, defaultHomepageContent.actions) as Promise<HomepageActionsContent>,
    readContent("homepage.featured_uses", "homepage", homepageFeaturedUsesSchema, defaultHomepageContent.featuredUses) as Promise<HomepageFeaturedUsesContent>,
    readContent("homepage.multilink", "homepage", homepageMarketingBlockSchema, defaultHomepageContent.multilink) as Promise<HomepageMarketingBlockContent>,
    readContent("homepage.how_it_works", "homepage", homepageHowItWorksSchema, defaultHomepageContent.howItWorks) as Promise<HomepageHowItWorksContent>,
    readContent("homepage.custom_branding", "homepage", homepageMarketingBlockSchema, defaultHomepageContent.customBranding) as Promise<HomepageMarketingBlockContent>,
    readContent("homepage.final_cta", "homepage", homepageFinalCtaSchema, defaultHomepageContent.finalCta) as Promise<HomepageFinalCtaContent>,
    getFaqContent()
  ]);

  return { hero, actions, featuredUses, multilink, howItWorks, customBranding, finalCta, faqs };
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
