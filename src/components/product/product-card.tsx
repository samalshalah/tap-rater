import Image from "next/image";
import Link from "next/link";
import type { MigratedProduct } from "@/data/migrated-products";
import { getReviewDestination } from "@/lib/product-page-content";
import { optimizedUploadSrc } from "@/lib/optimized-upload";
import { formatPrice, getCategoryBySlug } from "@/lib/products";
import { getLowestPurchasePriceCents, getProductPurchaseOptions } from "@/lib/purchase-options";
import { getProductVisual } from "@/lib/storefront-visuals";

export function ProductCard({ product, design }: { product: MigratedProduct; design?: "branded" }) {
  const image = getProductVisual(product);
  const category = getCategoryBySlug(product.categorySlug);
  const purchaseLabel = getPurchaseLabel(product, design);
  const destination = getReviewDestination(product);

  return (
    <Link
      href={`/product/${product.slug}`}
      prefetch={false}
      className="tr-product-card tr-hover-card group flex h-full min-w-0 flex-col overflow-hidden rounded-lg p-2.5 sm:p-3.5"
    >
      <div className="relative aspect-square w-full shrink-0 bg-white">
        <Image
          src={optimizedUploadSrc(image.src, 640)}
          alt={image.alt}
          fill
          unoptimized
          className="object-contain object-center p-1 mix-blend-multiply transition duration-300 group-hover:scale-[1.025]"
          sizes="(min-width: 1280px) 320px, (min-width: 1024px) 30vw, 44vw"
        />
      </div>
      <div className="flex flex-1 flex-col pt-2 [overflow-wrap:anywhere]">
        {design === "branded" && image.src === product.assetSet?.standardAngledImageUrl ? <p className="mb-2 text-xs text-muted">Standard design shown</p> : null}
        <p className="text-xs font-semibold text-accent">{category?.title ?? destination}</p>
        <p className="mb-2 mt-1.5 text-sm font-semibold leading-5 text-ink sm:text-base">{product.title}</p>
        <p className="mt-auto text-sm font-normal text-ink">{purchaseLabel}</p>
      </div>
    </Link>
  );
}

function getPurchaseLabel(product: MigratedProduct, design?: "branded") {
  const options = getProductPurchaseOptions(product);
  if (options.length === 0) {
    return "Unavailable";
  }

  if (design === "branded") {
    const option = options.find((item) => item.id === "branded_qr_direct");
    return option ? `Branded + QR: ${formatCompactPrice(option.priceCents)}` : "Branded unavailable";
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
