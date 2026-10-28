import { migratedProducts } from "@/data/migrated-products";
import type { CartItem } from "@/lib/cart";
import { buildProofApprovalSnapshot } from "@/lib/direct-production";
import { brandedStandComposition } from "@/lib/branded-composition";

export function customStandItem(productId = "google-review-stand"): CartItem & { setup: NonNullable<CartItem["setup"]> } {
  const product = migratedProducts.find(item => item.slug === productId)!;
  const setup: NonNullable<CartItem["setup"]> = {
    productSlug: productId, optionCode: "branded_qr_direct", destinationUrl: "https://g.page/example/review",
    businessName: "Example Business", logoMediaUrl: "/api/media/product/products/customer-setup-google-review-stand/center_asset/logo.png",
    generatedQrValue: "https://g.page/example/review", frontTemplateUrl: product.assetSet!.brandedFrontTemplateUrl,
    proofReceiptId: "12345678-1234-4234-8234-123456789012", rendererVersion: brandedStandComposition.templateVersion,
    baseTemplateContentHash: "a".repeat(64), logoContentHash: "b".repeat(64), proofApproved: true,
  };
  setup.proofApprovalSnapshot = buildProofApprovalSnapshot(setup as Parameters<typeof buildProofApprovalSnapshot>[0]);
  return { productId, optionId: "branded_qr_direct", quantity: 1, setup };
}
