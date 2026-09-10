import { describe, expect, it } from "vitest";
import { buildPayload } from "@/components/admin/website-editor";
import { defaultFooterContent, defaultHeaderNavigation, defaultHomepageContent } from "@/lib/website-content";
import { homepageShowcaseSchema } from "@/lib/homepage-showcase";

describe("homepage media editor", () => {
  it("round-trips the new media fields and keeps legacy branding fields when saving", () => {
    const content = structuredClone(defaultHomepageContent);
    const data = content.showcase;
    const form = new FormData();
    const fields = {
      "showcase-featured-enabled": "on", "showcase-featured-headline": data.featuredHeadline,
      "showcase-featured-slugs": data.featuredProductSlugs.join(", "), "showcase-hero-caption": data.heroCaption,
      "showcase-comparison-product": data.comparisonProductSlug,
      "showcase-video": data.tapVideoUrl, "showcase-poster": data.tapPosterUrl,
      "showcase-captions": data.tapCaptionsUrl, "showcase-transcript": data.tapTranscript,
      "showcase-quality-enabled": "on", "showcase-quality-headline": data.qualityHeadline
    };
    for (const [name, value] of Object.entries(fields)) form.set(name, value);
    for (const [prefix, image] of [["comparison-standard", data.comparisonStandard], ["comparison-branded", data.comparisonBranded], ["quality", data.qualityImage]] as const) {
      for (const [key, value] of Object.entries(image)) form.set(`${prefix}-${key}`, value);
    }
    data.scenes.forEach((scene, index) => {
      for (const key of ["slug", "title", "body"] as const) form.set(`scene-${index}-${key}`, scene[key]);
      form.set(`scene-${index}-product`, scene.productSlug);
      for (const [key, value] of Object.entries(scene.image)) form.set(`scene-${index}-${key}`, value);
    });
    const payload = buildPayload(form, defaultHeaderNavigation, defaultFooterContent, content);
    expect(payload.showcase.featuredProductSlugs).toHaveLength(5);
    expect(payload.showcase.scenes).toHaveLength(5);
    expect(homepageShowcaseSchema.parse(payload.showcase)).toEqual(data);
    expect(payload.featuredUses.businessUseSlugs).toEqual(data.scenes.map((scene) => scene.slug));
    expect(payload.customBranding.image).toEqual(content.customBranding.image);
    expect(payload.customBranding.cta).toEqual(content.customBranding.cta);
  });
});
