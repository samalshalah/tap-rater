import Image from "next/image";
import Link from "next/link";
import type { MigratedProduct } from "@/data/migrated-products";
import { getReviewDestination } from "@/lib/product-page-content";
import { formatPrice, getCategoryBySlug } from "@/lib/products";
import { getLowestPurchasePriceCents, getProductPurchaseOptions } from "@/lib/purchase-options";
import { getProductVisual } from "@/lib/storefront-visuals";

export function ProductCard({ product, density = "default" }: { product: MigratedProduct; density?: "default" | "compact" }) {
  const image = getProductVisual(product);
  const category = getCategoryBySlug(product.categorySlug);
  const purchaseLabel = getPurchaseLabel(product);
  const destination = getReviewDestination(product);
  const isCompact = density === "compact";

  return (
    <Link
      href={`/product/${product.slug}`}
      className={
        isCompact
          ? "group flex aspect-[4/5] h-full min-h-[300px] flex-col overflow-hidden rounded-[22px] bg-white p-3.5 shadow-[0_12px_30px_rgba(16,32,30,0.055)] ring-1 ring-black/[0.04] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(16,32,30,0.08)]"
          : "group flex aspect-[4/5] h-full min-h-[340px] flex-col overflow-hidden rounded-[28px] bg-white p-5 shadow-[0_16px_42px_rgba(16,32,30,0.08)] ring-1 ring-black/[0.04] transition hover:-translate-y-0.5 hover:shadow-[0_22px_58px_rgba(16,32,30,0.1)]"
      }
    >
      <div className={isCompact ? "relative min-h-0 flex-[1.35] bg-white" : "relative min-h-0 flex-[1.32] bg-white"}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          unoptimized
          className={isCompact ? "object-contain object-center p-1 mix-blend-multiply transition duration-300 group-hover:scale-[1.025]" : "object-contain object-center p-2 mix-blend-multiply transition duration-300 group-hover:scale-[1.025]"}
          sizes="(min-width: 1280px) 24vw, (min-width: 768px) 46vw, 88vw"
        />
      </div>
      <div className={isCompact ? "flex min-h-0 flex-[0.65] flex-col pt-2.5" : "flex min-h-0 flex-[0.68] flex-col pt-3"}>
        <p className="text-xs font-semibold text-accent">{category?.title ?? destination}</p>
        <p className={isCompact ? "mt-2 text-[0.98rem] font-semibold leading-[1.18] text-[#090b0f] sm:text-[1.02rem]" : "mt-2 text-[1.12rem] font-semibold leading-[1.18] text-[#090b0f] sm:text-[1.2rem]"}>{product.title}</p>
        <p className={isCompact ? "mt-3 text-sm font-normal text-[#090b0f]" : "mt-4 text-base font-normal text-[#090b0f]"}>{purchaseLabel}</p>
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

function formatCompactPrice(cents: number) {
  return formatPrice(cents).replace(".00", "");
}
