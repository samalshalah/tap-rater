import type { MigratedProduct, ProductProviderOption } from "@/data/migrated-products";

export const maxEditableProviderOptions = 12;

export function collectTemplateImages(form: FormData): MigratedProduct["templateImages"] | undefined {
  function readVariant(prefix: string) {
    const src = String(form.get(`${prefix}Src`) ?? "").trim();
    const alt = String(form.get(`${prefix}Alt`) ?? "").trim();
    return src ? { src, alt } : undefined;
  }

  const standard = readVariant("templateStandard");
  const branded = readVariant("templateBranded");
  const brandedWithQr = readVariant("templateBrandedWithQr");

  if (!standard && !branded && !brandedWithQr) return undefined;
  return { standard, branded, brandedWithQr };
}

export function collectProviderOptions(form: FormData): ProductProviderOption[] {
  return Array.from({ length: maxEditableProviderOptions }, (_, index) => {
    const slug = String(form.get(`providerSlug${index}`) ?? "").trim();
    const label = String(form.get(`providerLabel${index}`) ?? "").trim();
    const hint = String(form.get(`providerHint${index}`) ?? "").trim();

    if (!slug || !label) return null;
    return { slug, label, ...(hint ? { destinationUrlHint: hint } : {}) };
  }).filter((option): option is ProductProviderOption => Boolean(option));
}
