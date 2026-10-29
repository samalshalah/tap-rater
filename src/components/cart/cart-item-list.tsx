"use client";

import { shortProductTitle } from "@/lib/branded-product-title";

import { memo } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatPrice, getProductBySlug } from "@/lib/products";
import { getCartItemKey, getCartItemQuantityLimit, type CartRow } from "@/lib/cart";
import { getProductVisual, productImageFallback } from "@/lib/storefront-visuals";
import { optimizedUploadSrc } from "@/lib/optimized-upload";

type CartItemListProps = {
  rows: CartRow[];
  decreaseItem: (key: string) => void;
  increaseItem: (key: string) => void;
  removeItem: (key: string) => void;
};

// Cart rows and provider actions stay stable during customer and checkout updates.
export const CartItemList = memo(function CartItemList({ rows, decreaseItem, increaseItem, removeItem }: CartItemListProps) {
  return <>
        {rows.map((row) => {
          const cartKey = getCartItemKey(row.item);
          const rowImage = getCartRowImage(row);
          const hasHostedMultiLink = row.item.setup?.serviceMode === "HOSTED" && row.item.setup?.serviceAddon === "hosted_multilink";
          const connectionLabel = hasHostedMultiLink
            ? "Hosted Multi-Link"
            : row.option.hasQr
            ? "QR + NFC direct"
            : row.option.requiresDestinationUrl
              ? "NFC direct"
              : "";
          return (
            <div
              key={cartKey}
              className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0 md:grid-cols-[96px_minmax(0,1fr)_auto] md:items-start"
            >
              <div className="grid h-16 w-16 md:h-24 md:w-24 place-items-center overflow-hidden rounded-md border border-line bg-soft">
                {rowImage.src ? (
                  <img
                    src={optimizedUploadSrc(rowImage.src, 160)}
                    alt={rowImage.alt}
                    width={96}
                    height={96}
                    decoding="async"
                    onError={(event) => {
                      if (event.currentTarget.getAttribute("src") !== rowImage.src) {
                        event.currentTarget.src = rowImage.src;
                      }
                    }}
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <span className="text-xs text-muted">Stand</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-base font-medium leading-6 text-ink">{row.option.id === "branded_qr_direct" ? shortProductTitle(row.product.title) : row.product.title}</p>
                <p className="mt-1 text-sm font-medium text-brand">
                  {row.option.label}
                </p>
                <div className="mt-3 grid gap-1 text-sm leading-6 text-muted">
                  {row.item.setup?.destinationUrl ? (
                    <details className="min-w-0">
                      <summary className="cursor-pointer py-2 font-medium text-brand">View destination link</summary>
                      <p className="break-all text-ink">{row.item.setup.destinationUrl}</p>
                    </details>
                  ) : null}
                  {row.item.setup?.businessName ? (
                    <p>
                      <span className="text-muted">Business name:</span>{" "}
                      <span className="text-ink">{row.item.setup.businessName}</span>
                    </p>
                  ) : null}
                  {row.option.requiresLogo ? (
                    <p>
                      <span className="text-muted">Logo:</span>{" "}
                      <span className="text-ink">
                        {row.item.setup?.logoMediaUrl ||
                        row.item.setup?.logoStorageKey
                          ? "Uploaded"
                          : row.item.setup?.designAssistanceRequested
                            ? "Tap Rater will prepare"
                            : "Missing"}
                      </span>
                    </p>
                  ) : null}
                  {connectionLabel ? (
                    <p>
                      <span className="text-muted">Connection:</span>{" "}
                      <span className="text-ink">{connectionLabel}</span>
                    </p>
                  ) : null}
                  {hasHostedMultiLink && row.item.setup?.monthlyPriceCents ? (
                    <p>
                      <span className="text-muted">Service:</span>{" "}
                      <span className="text-ink">{formatPrice(row.item.setup.monthlyPriceCents)}/mo Multi-Link hosting</span>
                    </p>
                  ) : null}
                  {hasHostedMultiLink ? (
                    <p>
                      <span className="text-muted">Links:</span>{" "}
                      <span className="text-ink">{row.item.setup?.multiLinkButtons?.length ? `${row.item.setup.multiLinkButtons.length} added` : "Skipped for later"}</span>
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="col-span-2 grid grid-cols-[auto_1fr_auto] items-center gap-3 md:col-span-1 md:min-w-52 md:grid-cols-1 md:justify-items-end">
                <div className="flex h-10 w-fit items-center overflow-hidden rounded-lg border border-line bg-white">
                  <button
                    type="button"
                    aria-label={`Decrease ${row.option.id === "branded_qr_direct" ? shortProductTitle(row.product.title) : row.product.title} quantity`}
                    className="grid h-10 w-10 place-items-center text-ink hover:bg-soft disabled:cursor-not-allowed disabled:text-muted"
                    disabled={row.item.quantity <= 1}
                    onClick={() => decreaseItem(cartKey)}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="grid h-10 min-w-11 place-items-center border-x border-line px-3 text-sm font-medium text-ink">
                    {row.item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase ${row.option.id === "branded_qr_direct" ? shortProductTitle(row.product.title) : row.product.title} quantity`}
                    className="grid h-10 w-10 place-items-center text-ink hover:bg-soft disabled:cursor-not-allowed disabled:text-muted"
                    disabled={row.item.quantity >= getCartItemQuantityLimit(row.item)}
                    onClick={() => increaseItem(cartKey)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="text-left sm:text-center md:text-right">
                  <p className="tr-caption uppercase">Item total</p>
                  <p className="text-lg font-medium text-ink">
                    {formatPrice(row.lineSubtotalCents)}
                  </p>
                  <p className="tr-caption">{formatPrice(row.unitPriceCents)} each</p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${row.option.id === "branded_qr_direct" ? shortProductTitle(row.product.title) : row.product.title}`}
                  className="tr-icon-button text-brand"
                  onClick={() => removeItem(cartKey)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          );
        })}
  </>;
});

function getCartRowImage(row: CartRow) {
  const product = getProductBySlug(row.item.productId);
  if (product) {
    const visual = getProductVisual(product);
    return visual;
  }

  const proofPreviewData = row.item.setup?.proofPreviewData;
  const previewImage =
    readString(proofPreviewData?.previewImageUrl) ??
    readString(row.item.setup?.frontTemplateUrl) ??
    readString(row.item.setup?.centerAssetUrl);

  return previewImage
    ? { src: previewImage, alt: row.product.title }
    : { ...productImageFallback, alt: row.product.title };
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
