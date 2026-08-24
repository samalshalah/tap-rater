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
      className="group flex h-full flex-col overflow-hidden rounded-[22px] border border-line/80 bg-white p-3 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg"
    >
      <div className="relative h-56 overflow-hidden rounded-[18px] bg-soft sm:h-64">
        <Image src={image.src} alt={image.alt} fill unoptimized className="object-contain p-2 transition duration-200 scale-[1.08] group-hover:scale-[1.12]" />
      </div>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-5">
        <p className="text-xs font-black uppercase tracking-[0.08em] text-brand">{category?.title ?? destination}</p>
        <h2 className="mt-2 text-xl font-black leading-snug text-ink">{product.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{setupLabel}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {options.some((option) => option.id === "standard_direct") ? (
            <span className="tr-pill-neutral">Standard Direct</span>
          ) : null}
          {options.some((option) => option.id === "branded_qr_direct") ? (
            <span className="tr-pill-brand">Branded + QR</span>
          ) : null}
        </div>
        <div className="mt-auto grid gap-3 pt-5">
          <span className="text-base font-black text-ink">{purchaseLabel}</span>
          <span className="tr-button-primary min-h-10 w-full px-4">
            View Product
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

  if (getProductPurchaseOptions(product).some((option) => option.id === "branded_qr_direct")) {
    return "Choose ready-made QR + NFC or branded QR + NFC on the product page.";
  }

  return "QR + NFC direct stand with one destination link.";
}

function formatCompactPrice(cents: number) {
  return formatPrice(cents).replace(".00", "");
}
