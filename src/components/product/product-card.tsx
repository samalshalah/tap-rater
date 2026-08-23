import Image from "next/image";
import Link from "next/link";
import type { MigratedProduct } from "@/data/migrated-products";
import { getReviewDestination } from "@/lib/product-page-content";
import { formatPrice, getCategoryBySlug } from "@/lib/products";
import { getLowestPurchasePriceCents, getProductPurchaseOptions } from "@/lib/purchase-options";
import { getProductVisual } from "@/lib/storefront-visuals";

export function ProductCard({ product }: { product: MigratedProduct }) {
  const image = getProductVisual(product);
  const category = getCategoryBySlug(product.categorySlug);
  const options = getProductPurchaseOptions(product);
  const purchaseLabel = getPurchaseLabel(product);
  const destination = getReviewDestination(product);
  const setupLabel = getSetupLabel(product);

  return (
    <Link
      href={`/product/${product.slug}`}
      className="tr-hover-card group flex h-full flex-col p-3.5"
    >
      <div className="relative h-48 overflow-hidden rounded-lg border border-line/70 bg-soft">
        <Image src={image.src} alt={image.alt} fill unoptimized className="object-contain p-3 transition duration-200 group-hover:scale-[1.025]" />
      </div>
      <div className="flex flex-1 flex-col pt-3.5">
        <p className="tr-eyebrow">{category?.title ?? destination}</p>
        <h2 className="mt-1.5 text-[17px] font-semibold leading-snug text-ink">{product.title}</h2>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {options.some((option) => option.id === "standard_direct") ? (
            <span className="tr-pill-neutral">Standard Direct</span>
          ) : null}
          {options.some((option) => option.id === "branded_qr_direct") ? (
            <span className="tr-pill-brand">Branded + QR</span>
          ) : null}
        </div>
        <p className="mt-3 text-[13px] leading-5 text-muted">{setupLabel}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="text-sm font-semibold text-ink">{purchaseLabel}</span>
          <span className="tr-button-primary min-h-9 min-w-[92px] px-4">
            View
          </span>
        </div>
      </div>
    </Link>
  );
}

function getPurchaseLabel(product: MigratedProduct) {
  const options = getProductPurchaseOptions(product);
  if (options.length === 0) {
    return "Unavailable";
  }

  if (product.checkoutMode === "request_quote") {
    return "Request quote";
  }

  if (product.checkoutMode === "contact_sales") {
    return "Contact sales";
  }

  if (product.checkoutMode === "subscription") {
    return "Subscription setup";
  }

  return `From ${formatCompactPrice(getLowestPurchasePriceCents(product))}`;
}

function getSetupLabel(product: MigratedProduct) {
  if (product.checkoutMode === "request_quote") {
    return "Request custom help";
  }

  if (product.slug === "custom-direct-stand" || product.allowsCustomDesign) {
    return "Custom Direct Stand";
  }

  if (product.customizationOptions.includes("add_logo")) {
    return "Choose ready-made QR + NFC or branded QR + NFC on the product page.";
  }

  return "NFC direct stand with one destination link.";
}

function formatCompactPrice(cents: number) {
  return formatPrice(cents).replace(".00", "");
}
