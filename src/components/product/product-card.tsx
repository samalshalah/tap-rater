import Image from "next/image";
import Link from "next/link";
import type { MigratedProduct } from "@/data/migrated-products";
import { getReviewDestination } from "@/lib/product-page-content";
import { optimizedUploadSrc } from "@/lib/optimized-upload";
import { formatPrice, getCategoryBySlug } from "@/lib/products";
import { getLowestPurchasePriceCents, getProductPurchaseOptions } from "@/lib/purchase-options";
import { getProductVisual } from "@/lib/storefront-visuals";

export function ProductCard({ product, density = "default" }: { product: MigratedProduct; density?: "default" | "compact" | "catalog" }) {
  const image = getProductVisual(product);
  const category = getCategoryBySlug(product.categorySlug);
  const purchaseLabel = getPurchaseLabel(product);
  const destination = getReviewDestination(product);
  const isCompact = density === "compact";
  const isCatalog = density === "catalog";

  return (
    <Link
      href={`/product/${product.slug}`}
      prefetch={false}
      className={
        isCatalog
          ? "tr-hover-card group flex h-full min-w-0 flex-col overflow-hidden rounded-lg p-2.5 sm:p-3.5"
          : isCompact
          ? "tr-hover-card group flex aspect-[4/5] h-full min-h-[300px] flex-col overflow-hidden p-3.5"
          : "tr-hover-card group flex aspect-[4/5] h-full min-h-[340px] flex-col overflow-hidden p-5"
      }
    >
      <div className={isCatalog ? "relative aspect-square w-full shrink-0 bg-white" : isCompact ? "relative min-h-0 flex-[1.42] bg-white" : "relative min-h-0 flex-[1.38] bg-white"}>
        <Image
          src={optimizedUploadSrc(image.src, 640)}
          alt={image.alt}
          fill
          unoptimized
          className={isCompact ? "object-contain object-center p-0.5 mix-blend-multiply transition duration-300 group-hover:scale-[1.025]" : "object-contain object-center p-1 mix-blend-multiply transition duration-300 group-hover:scale-[1.025]"}
          sizes={isCatalog ? "(min-width: 1280px) 230px, (min-width: 768px) 30vw, 44vw" : "(min-width: 1280px) 24vw, (min-width: 768px) 46vw, 88vw"}
        />
      </div>
      <div className={isCatalog ? "flex flex-1 flex-col pt-2 [overflow-wrap:anywhere]" : isCompact ? "flex min-h-0 flex-[0.58] flex-col pt-2" : "flex min-h-0 flex-[0.62] flex-col pt-3"}>
        <p className="text-xs font-semibold text-accent">{category?.title ?? destination}</p>
        <p className={isCatalog ? "mb-2 mt-1.5 text-sm font-semibold leading-5 text-ink sm:text-base" : isCompact ? "mt-1.5 text-[0.98rem] font-semibold leading-[1.18] text-ink sm:text-[1.02rem]" : "mt-1.5 text-[1.12rem] font-semibold leading-[1.18] text-ink sm:text-[1.2rem]"}>{product.title}</p>
        <p className={isCatalog ? "mt-auto text-sm font-normal text-ink" : isCompact ? "mt-2 text-sm font-normal text-ink" : "mt-2.5 text-base font-normal text-ink"}>{purchaseLabel}</p>
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
