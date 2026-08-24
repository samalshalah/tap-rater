import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/admin-auth";
import {
  faqContentSchema,
  footerContentSchema,
  headerNavigationSchema,
  homepageActionsSchema,
  homepageFeaturedUsesSchema,
  homepageFinalCtaSchema,
  homepageHeroSchema,
  homepageHowItWorksSchema,
  homepageMarketingBlockSchema,
  saveWebsiteContentRecord
} from "@/lib/website-content";

const payloadSchema = {
  header: headerNavigationSchema,
  footer: footerContentSchema,
  hero: homepageHeroSchema,
  actions: homepageActionsSchema,
  featuredUses: homepageFeaturedUsesSchema,
  multilink: homepageMarketingBlockSchema,
  howItWorks: homepageHowItWorksSchema,
  customBranding: homepageMarketingBlockSchema,
  finalCta: homepageFinalCtaSchema,
  faqs: faqContentSchema
};

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Website content is invalid." }, { status: 400 });
  }

  const parsed = Object.fromEntries(
    Object.entries(payloadSchema).map(([key, schema]) => [key, schema.safeParse((body as Record<string, unknown>)[key])])
  ) as Record<keyof typeof payloadSchema, ReturnType<(typeof payloadSchema)[keyof typeof payloadSchema]["safeParse"]>>;

  if (Object.values(parsed).some((result) => !result.success)) {
    return NextResponse.json({ error: "Website content is invalid. Check required labels, links, images, and FAQ fields." }, { status: 400 });
  }

  try {
    await Promise.all([
      saveWebsiteContentRecord("navigation.header", "section", parsed.header.data),
      saveWebsiteContentRecord("navigation.footer", "section", parsed.footer.data),
      saveWebsiteContentRecord("homepage.hero", "homepage", parsed.hero.data),
      saveWebsiteContentRecord("homepage.actions", "homepage", parsed.actions.data),
      saveWebsiteContentRecord("homepage.featured_uses", "homepage", parsed.featuredUses.data),
      saveWebsiteContentRecord("homepage.multilink", "homepage", parsed.multilink.data),
      saveWebsiteContentRecord("homepage.how_it_works", "homepage", parsed.howItWorks.data),
      saveWebsiteContentRecord("homepage.custom_branding", "homepage", parsed.customBranding.data),
      saveWebsiteContentRecord("homepage.final_cta", "homepage", parsed.finalCta.data),
      saveWebsiteContentRecord("faqs.global", "section", parsed.faqs.data)
    ]);

    ["/", "/shop", "/solutions", "/faqs"].forEach((path) => revalidatePath(path));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Website content could not be saved." }, { status: 500 });
  }
}
