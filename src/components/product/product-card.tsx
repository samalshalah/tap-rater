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
      className="group flex h-full flex-col rounded-[18px] border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_18px_42px_rgba(17,24,39,0.08)]"
    >
      <div className="relative h-52 overflow-hidden rounded-[14px] border border-line/70 bg-white">
        <Image src={image.src} alt={image.alt} fill unoptimized className="object-contain p-3 transition duration-200 group-hover:scale-[1.03]" />
      </div>
      <div className="flex flex-1 flex-col pt-4">
        <p className="text-[12px] font-black uppercase tracking-[0.08em] text-brand">{category?.title ?? destination}</p>
        <h2 className="mt-2 text-lg font-black leading-snug text-ink">{product.title}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {options.some((option) => option.id === "standard_direct") ? (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.04em] text-muted">Standard Direct</span>
          ) : null}
          {options.some((option) => option.id === "branded_qr_direct") ? (
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.04em] text-brand">Branded + QR</span>
          ) : null}
        </div>
        <p className="mt-3 text-sm leading-5 text-muted">{setupLabel}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <span className="text-sm font-black text-ink">{purchaseLabel}</span>
          <span className="inline-flex min-h-9 min-w-[104px] items-center justify-center rounded-full bg-ink px-5 text-sm font-black text-white transition group-hover:bg-brand">
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
    return "Choose NFC only or NFC + printed QR on the product page.";
  }

  return "NFC direct stand with one destination link.";
}

function formatCompactPrice(cents: number) {
  return formatPrice(cents).replace(".00", "");
}
