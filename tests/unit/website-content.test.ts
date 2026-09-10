import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultFaqContent, defaultFooterContent, defaultHomepageContent,
  getFaqContent, getFooterContent, getHomepageThemeContent
} from "@/lib/website-content";

const storage = vi.hoisted(() => ({ configured: false, records: new Map<string, unknown>(), getClient: vi.fn() }));
vi.mock("next/cache", () => ({ unstable_noStore: vi.fn() }));
vi.mock("@/lib/db", () => ({
  hasSupabaseAdminConfig: () => storage.configured,
  getSupabaseAdmin: storage.getClient
}));

beforeEach(() => {
  storage.configured = false;
  storage.records.clear();
  storage.getClient.mockReset().mockReturnValue({
    from: () => ({ select: () => ({ eq: (_column: string, key: string) => ({
      maybeSingle: async () => ({ data: { payload: storage.records.get(key) }, error: null })
    }) }) })
  });
});

describe("public website capability copy", () => {
  it("does not keep replacing merchant choices after the redesigned homepage is saved", async () => {
    storage.configured = true;
    const hero = { ...structuredClone(defaultHomepageContent.hero), headline: "Turn Every Tap Into Action.", image: { src: "/uploads/products/rate-your-experience-stand.png", alt: "Merchant selected stand" } };
    storage.records.set("homepage.hero", hero);
    storage.records.set("homepage.showcase", structuredClone(defaultHomepageContent.showcase));
    storage.records.set("faqs.global", { items: defaultFaqContent.items.slice(0, 4) });
    const content = await getHomepageThemeContent();
    expect(content.hero.headline).toBe(hero.headline);
    expect(content.hero.image).toEqual(hero.image);
    expect(content.faqs.items).toHaveLength(4);
  });

  it("uses accurate fallback copy without requesting a database client", async () => {
    const content = await getHomepageThemeContent();
    expect(content.hero.headline).toBe("Tap Rater NFC Business Stands.");
    expect(content.showcase.comparisonStandard.alt).toContain("NFC only");
    expect(content.faqs.items[0].answer).toContain("Standard Direct stand");
    expect(content.customBranding.body).toContain("Approve the artwork preview before payment.");
    expect(content.customBranding.body).toContain("Final print artwork is generated after payment.");
    expect((await getFooterContent()).intro).toContain("Standard is NFC-only");
    expect(storage.getClient).not.toHaveBeenCalled();
  });

  it("corrects known saved FAQ claims without changing custom entries or editorial settings", async () => {
    storage.configured = true;
    const record = structuredClone(defaultFaqContent);
    record.items[0] = { ...record.items[0], order: 70, enabled: false,
      answer: "A Standard Direct stand opens one customer-provided destination URL by QR code and NFC tap. That can be a review page, menu, booking page, survey, social profile, website, or custom URL." };
    record.items[1].answer = "No. Standard Direct sends QR and NFC directly to your provided URL and does not require a Tap Rater account, hosted redirect, activation, or subscription.";
    record.items[2].answer = "Products that support Branded setup let you add approved business details, upload a logo where supported, preview the proof, and approve it before adding to cart.";
    record.items[3].answer = "Keep printed QR production instructions next to your Branded stand.";
    const original = structuredClone(record);
    storage.records.set("faqs.global", record);
    const content = await getFaqContent();

    expect(content.items[0]).toMatchObject({ order: 70, enabled: false, question: record.items[0].question });
    expect(content.items[0].answer).toContain("by NFC tap, with no printed QR.");
    expect(content.items[1].answer).not.toContain("QR and NFC");
    expect(content.items[2].answer).toContain("Approve the artwork preview before payment.");
    expect(content.items[2].answer).toContain("Final print artwork is generated after payment.");
    expect(content.items[3]).toEqual(original.items[3]);
    expect(record).toEqual(original);
    storage.records.set("faqs.global", content);
    expect(await getFaqContent()).toEqual(content);
  });

  it("corrects known hero, branding and footer values but preserves media, links and custom wording", async () => {
    storage.configured = true;
    const hero = { ...structuredClone(defaultHomepageContent.hero), enabled: false,
      headline: "Our printed production instructions",
      eyebrow: "NFC + QR Business Stands",
      body: "Tap Rater stands help customers review, book, follow, view menus, and visit your links with one tap or scan.",
      proofPoints: ["NFC + QR Ready", "Custom printed QR for Branded"],
      image: { src: "/production/printed-QR.png", alt: "Custom printed QR production preview" }
    };
    const branding = { ...structuredClone(defaultHomepageContent.customBranding),
      body: "Add your business name, logo where supported, and destination. Preview your stand before ordering so you know what will be printed.",
      bullets: ["Your logo", "Preview before ordering", "Custom production instructions"]
    };
    storage.records.set("homepage.hero", hero);
    storage.records.set("homepage.custom_branding", branding);
    storage.records.set("navigation.footer", { ...defaultFooterContent,
      intro: "custom printed NFC and QR tabletop stands for reviews, menus, booking, social media, feedback, and custom business links." });
    const content = await getHomepageThemeContent();

    expect(content.hero).toMatchObject({ enabled: false, headline: hero.headline, primaryCta: hero.primaryCta, image: hero.image });
    expect(content.hero.eyebrow).toBe("NFC Business Stands");
    expect(content.hero.proofPoints).toEqual(["NFC Ready", "Custom printed QR for Branded"]);
    expect(content.customBranding.body).toContain("Final print artwork is generated after payment.");
    expect(content.customBranding.bullets).toEqual(["Your logo", "Approve preview before payment", "Custom production instructions"]);
    expect(content.customBranding.cta).toEqual(branding.cta);
    expect((await getFooterContent()).intro).toContain("Standard is NFC-only");
    expect(hero.eyebrow).toBe("NFC + QR Business Stands");
  });

  it("preserves unrecognized saved copy instead of broadly stripping printed or production wording", async () => {
    storage.configured = true;
    const custom = "Our Branded printed QR is prepared for production after your preview approval.";
    storage.records.set("homepage.custom_branding", { ...defaultHomepageContent.customBranding, body: custom });
    storage.records.set("navigation.footer", { ...defaultFooterContent, intro: custom });
    expect((await getHomepageThemeContent()).customBranding.body).toBe(custom);
    expect((await getFooterContent()).intro).toBe(custom);
  });
});
