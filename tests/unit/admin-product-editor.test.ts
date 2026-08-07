import { describe, expect, it } from "vitest";
import { collectProviderOptions, collectTemplateImages } from "@/lib/admin-product-form-helpers";

function buildFormData(entries: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    form.set(key, value);
  }
  return form;
}

describe("admin product editor -- collectProviderOptions", () => {
  it("collects only rows that have both a slug and a label", () => {
    const form = buildFormData({
      providerSlug0: "vagaro",
      providerLabel0: "Vagaro",
      providerHint0: "https://www.vagaro.com/your-business",
      providerSlug1: "calendly",
      providerLabel1: "Calendly"
      // row 1 has no hint -- optional, should be omitted, not empty string
    });

    const options = collectProviderOptions(form);

    expect(options).toEqual([
      { slug: "vagaro", label: "Vagaro", destinationUrlHint: "https://www.vagaro.com/your-business" },
      { slug: "calendly", label: "Calendly" }
    ]);
  });

  it("skips a row with only a slug or only a label (both required)", () => {
    const form = buildFormData({
      providerSlug0: "vagaro"
      // no label for row 0
    });

    expect(collectProviderOptions(form)).toEqual([]);
  });

  it("returns an empty array when no provider rows are filled in", () => {
    const form = new FormData();
    expect(collectProviderOptions(form)).toEqual([]);
  });

  it("trims whitespace from slug/label/hint", () => {
    const form = buildFormData({
      providerSlug0: "  vagaro  ",
      providerLabel0: "  Vagaro  "
    });

    expect(collectProviderOptions(form)).toEqual([{ slug: "vagaro", label: "Vagaro" }]);
  });
});

describe("admin product editor -- collectTemplateImages", () => {
  it("collects only the variants that have a src filled in", () => {
    const form = buildFormData({
      templateStandardSrc: "/uploads/templates/google-standard.png",
      templateStandardAlt: "Google standard template"
      // branded and brandedWithQr left blank
    });

    const result = collectTemplateImages(form);

    expect(result).toEqual({
      standard: { src: "/uploads/templates/google-standard.png", alt: "Google standard template" },
      branded: undefined,
      brandedWithQr: undefined
    });
  });

  it("returns undefined when no template image fields are filled in at all", () => {
    const form = new FormData();
    expect(collectTemplateImages(form)).toBeUndefined();
  });

  it("collects all three variants when all three are provided", () => {
    const form = buildFormData({
      templateStandardSrc: "/a.png",
      templateStandardAlt: "A",
      templateBrandedSrc: "/b.png",
      templateBrandedAlt: "B",
      templateBrandedWithQrSrc: "/c.png",
      templateBrandedWithQrAlt: "C"
    });

    expect(collectTemplateImages(form)).toEqual({
      standard: { src: "/a.png", alt: "A" },
      branded: { src: "/b.png", alt: "B" },
      brandedWithQr: { src: "/c.png", alt: "C" }
    });
  });
});
