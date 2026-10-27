"use client";
import { optimizedUploadSrc } from "@/lib/optimized-upload";
import { formatPrice } from "@/lib/products";
import { type PurchaseOption } from "@/lib/purchase-options";
import { CheckCircle2 } from "lucide-react";
import Image from "next/image";
import type { LinkExperienceId } from "./product-setup-chooser-types";
export function BuilderSummary({
  className = "",
  image,
  linkExperience,
  productTitle,
  quantity,
  unitPriceCents,
  option
}: {
  className?: string;
  image: { src: string; alt: string };
  linkExperience: LinkExperienceId;
  productTitle: string;
  quantity: number;
  unitPriceCents: number | null;
  option: PurchaseOption;
}) {
  const serviceLabel = linkExperience === "multilink" ? "Hosted Multi-Link" : option.hasQr ? "QR and NFC direct" : "NFC direct · No printed QR";
  const itemPrice = unitPriceCents ?? option.priceCents;

  return (
    <div className={`tr-panel-muted grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 p-3 sm:grid-cols-[96px_minmax(0,1fr)] ${className}`}>
      <div className="relative aspect-square overflow-hidden rounded-lg bg-white">
        <Image src={optimizedUploadSrc(image.src, 160)} alt={image.alt} fill unoptimized className="object-contain p-2" />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">{productTitle}</p>
        <p className="mt-1 text-sm text-muted">{option.label} · {formatPrice(itemPrice)}{quantity > 1 ? ` · Qty ${quantity}` : ""}</p>
        <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.05em] text-brand">
          <CheckCircle2 size={14} />
          {serviceLabel}
        </p>
      </div>
    </div>
  );
}

export function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="[overflow-wrap:anywhere]">
      <strong className="text-ink">{label}:</strong> {value}
    </p>
  );
}
