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
  const swatches = getColorSwatches(product);
  const isCompact = density === "compact";

  return (
    <Link
      href={`/product/${product.slug}`}
      className={
        isCompact
          ? "group flex aspect-[4/5] h-full min-h-[330px] flex-col overflow-hidden rounded-[22px] bg-white p-4 shadow-[0_12px_30px_rgba(16,32,30,0.055)] ring-1 ring-black/[0.04] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(16,32,30,0.08)]"
          : "group flex aspect-[4/5] h-full min-h-[360px] flex-col overflow-hidden rounded-[28px] bg-white p-6 shadow-[0_16px_42px_rgba(16,32,30,0.08)] ring-1 ring-black/[0.04] transition hover:-translate-y-0.5 hover:shadow-[0_22px_58px_rgba(16,32,30,0.1)]"
      }
    >
      <div className={isCompact ? "relative min-h-0 flex-[1.15] bg-white" : "relative min-h-0 flex-[1.2] bg-white"}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          unoptimized
          className="object-contain object-center p-3 mix-blend-multiply transition duration-300 group-hover:scale-[1.025]"
          sizes="(min-width: 1280px) 24vw, (min-width: 768px) 46vw, 88vw"
        />
      </div>
      {swatches.length > 0 ? (
        <div className={isCompact ? "mt-2 flex min-h-5 items-center justify-center gap-2" : "mt-3 flex min-h-5 items-center justify-center gap-2"} aria-label="Available colors">
          {swatches.slice(0, 6).map((swatch) => (
            <span
              key={swatch.label}
              className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10"
              style={{ background: swatch.color }}
              title={swatch.label}
            />
          ))}
          {swatches.length > 6 ? <span className="text-sm font-medium text-[#53616d]">+</span> : null}
        </div>
      ) : null}
      <div className={isCompact ? "flex min-h-0 flex-[0.85] flex-col pt-4" : "flex min-h-0 flex-[0.8] flex-col pt-5"}>
        <p className="text-xs font-semibold text-accent">{category?.title ?? destination}</p>
        <p className={isCompact ? "mt-2 text-[0.98rem] font-semibold leading-[1.18] text-[#090b0f] sm:text-[1.02rem]" : "mt-2 text-[1.12rem] font-semibold leading-[1.18] text-[#090b0f] sm:text-[1.2rem]"}>{product.title}</p>
        <p className={isCompact ? "mt-auto pt-4 text-sm font-normal text-[#090b0f]" : "mt-auto pt-5 text-base font-normal text-[#090b0f]"}>{purchaseLabel}</p>
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

function getColorSwatches(product: MigratedProduct) {
  if (!Array.isArray(product.variants) || product.variants.length <= 1) {
    return [];
  }

  return product.variants
    .map((variant) => ({ label: variant.label, color: getSwatchColor(variant.id, variant.label) }))
    .filter((swatch): swatch is { label: string; color: string } => Boolean(swatch.color));
}

function getSwatchColor(id: string, label: string) {
  const value = `${id} ${label}`.toLowerCase();

  if (value.includes("white")) return "#f5f2ed";
  if (value.includes("black")) return "#1e2226";
  if (value.includes("silver")) return "#d7d9da";
  if (value.includes("gray") || value.includes("grey")) return "#71747a";
  if (value.includes("blue")) return "#54738f";
  if (value.includes("green")) return "#7f947d";
  if (value.includes("red")) return "#e45f5d";
  if (value.includes("orange") || value.includes("guava")) return "#ff6d73";
  if (value.includes("brown")) return "#7a5443";

  return "";
}
