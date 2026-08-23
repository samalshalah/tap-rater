import type { MigratedProduct } from "@/data/migrated-products";
import type { ProductOption } from "@/lib/catalog-architecture";

export type BrandedTemplateReadiness =
  | { status: "not_offered" }
  | { status: "ready" }
  | { status: "missing"; reason: string };

export function getBrandedProductionTemplateReadiness(
  product: Pick<MigratedProduct, "assetSet">,
  options: Pick<ProductOption, "optionCode" | "isActive">[]
): BrandedTemplateReadiness {
  const brandedOffered = options.some((option) => option.optionCode === "branded_qr_direct" && option.isActive);
  if (!brandedOffered) {
    return { status: "not_offered" };
  }

  if (product.assetSet?.brandedFrontTemplateUrl) {
    return { status: "ready" };
  }

  return {
    status: "missing",
    reason: "Branded Direct requires a branded front template before it can generate production artwork."
  };
}
