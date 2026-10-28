import { customOnlyPublicContent } from "@/lib/custom-only-public-content";
import { defaultHeaderNavigation, defaultFooterContent, defaultFaqContent, defaultHomepageContent } from "./website-content-defaults";
export { defaultHeaderNavigation, defaultFooterContent, defaultFaqContent, defaultHomepageContent } from "./website-content-defaults";
import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";
import { publicDataCache, websiteCacheTag } from "@/lib/public-data-cache";
import { z } from "zod";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { defaultHomepageShowcase, homepageShowcaseSchema, type HomepageShowcaseContent } from "@/lib/homepage-showcase";

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
  intro: z.string().trim().max(500).default("NFC tabletop stands for local businesses. Every stand includes your logo, business name, NFC and a printed QR code."),
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

export async function getHeaderNavigationContent(records?: Record<string, unknown>) {
  return readContent("navigation.header", "section", headerNavigationSchema, defaultHeaderNavigation, records) as Promise<HeaderNavigationContent>;
}

export async function getFooterContent(records?: Record<string, unknown>) {
  const content = await readContent("navigation.footer", "section", footerContentSchema, defaultFooterContent, records) as FooterContent;
  return { ...content, intro: correctKnownWebsiteClaim("navigation.footer.intro", content.intro) };
}

export async function getFaqContent(records?: Record<string, unknown>) {
  const content = await readContent("faqs.global", "section", faqContentSchema, defaultFaqContent, records) as FaqContent;
  return { ...content, items: content.items.map((item) => ({
    ...item,
    answer: correctKnownWebsiteClaim("faqs.global.answer", item.answer)
  })) };
}

export async function getHomepageThemeContent(): Promise<HomepageThemeContent> {
  const records = await loadPublicWebsiteContent().catch(() => ({}));
  const readHomepage = <T,>(key: string, type: "homepage" | "section" | "page" | "seo", schema: z.ZodType<T>, fallback: T) => readContent(key, type, schema, fallback, records);
  const [hero, actions, featuredUses, multilink, howItWorks, customBranding, finalCta, faqs, storedShowcase] = await Promise.all([
    readHomepage("homepage.hero", "homepage", homepageHeroSchema, defaultHomepageContent.hero) as Promise<HomepageHeroContent>,
    readHomepage("homepage.actions", "homepage", homepageActionsSchema, defaultHomepageContent.actions) as Promise<HomepageActionsContent>,
    readHomepage("homepage.featured_uses", "homepage", homepageFeaturedUsesSchema, defaultHomepageContent.featuredUses) as Promise<HomepageFeaturedUsesContent>,
    readHomepage("homepage.multilink", "homepage", homepageMarketingBlockSchema, defaultHomepageContent.multilink) as Promise<HomepageMarketingBlockContent>,
    readHomepage("homepage.how_it_works", "homepage", homepageHowItWorksSchema, defaultHomepageContent.howItWorks) as Promise<HomepageHowItWorksContent>,
    readHomepage("homepage.custom_branding", "homepage", homepageMarketingBlockSchema, defaultHomepageContent.customBranding) as Promise<HomepageMarketingBlockContent>,
    readHomepage("homepage.final_cta", "homepage", homepageFinalCtaSchema, defaultHomepageContent.finalCta) as Promise<HomepageFinalCtaContent>,
    getFaqContent(records),
    readHomepage("homepage.showcase", "homepage", homepageShowcaseSchema.nullable(), null) as Promise<HomepageShowcaseContent | null>
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

const publicWebsiteKeys = ["navigation.header", "navigation.footer", "faqs.global", "homepage.hero", "homepage.actions", "homepage.featured_uses", "homepage.multilink", "homepage.how_it_works", "homepage.custom_branding", "homepage.final_cta", "homepage.showcase"];

const readPublicWebsiteContent = publicDataCache(async (): Promise<Record<string, unknown>> => {
  const { data, error } = await getSupabaseAdmin().from("site_content").select("key,payload").in("key", publicWebsiteKeys);
  if (error) throw new Error(error.message);
  return Object.fromEntries((data ?? []).map((row: { key: string; payload: unknown }) => [row.key, row.payload]));
}, "public-website-records-v1", websiteCacheTag);

export const loadPublicWebsiteContent = cache(async (): Promise<Record<string, unknown>> => {
  if (!hasSupabaseAdminConfig()) return {};
  return readPublicWebsiteContent();
});

async function readContent<T>(key: string, type: "homepage" | "section" | "page" | "seo", schema: z.ZodType<T>, fallback: T, records?: Record<string, unknown>): Promise<T> {
  noStore();
  try {
    const parsed = schema.safeParse((records ?? await loadPublicWebsiteContent())[key]);
    return customOnlyPublicContent(parsed.success ? parsed.data : fallback);
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
    ["Current shipping rates and free-shipping eligibility are shown in your cart and at checkout. Shipping and applicable tax are shown before payment. Preparation and delivery estimates are not yet confirmed; contact us before ordering for a deadline.", defaultFaqContent.items.find(item => item.question === "How much is shipping?")!.answer],
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
