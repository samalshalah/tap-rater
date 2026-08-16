"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-provider";
import type { MigratedProduct } from "@/data/migrated-products";
import { formatPrice } from "@/lib/products";
import { getProductPurchaseOptions, type PurchaseOptionId } from "@/lib/purchase-options";

type ProductSetupChooserProduct = Pick<MigratedProduct, "slug" | "title" | "sku" | "shortDescription" | "categorySlug" | "allowsCustomDesign">;

export function ProductSetupChooser({ product }: { product: ProductSetupChooserProduct }) {
  const options = useMemo(() => getProductPurchaseOptions(product), [product]);
  const [selectedOptionId, setSelectedOptionId] = useState<PurchaseOptionId>(options[0]?.id ?? "standard_direct");
  const [error, setError] = useState("");
  const cart = useCart();
  const router = useRouter();
  const selectedOption = options.find((option) => option.id === selectedOptionId) ?? options[0];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = new FormData(event.currentTarget);
    const destinationUrl = String(form.get("destinationUrl") ?? "").trim();
    const businessName = String(form.get("businessName") ?? "").trim();
    const headline = String(form.get("headline") ?? "").trim();
    const cta = String(form.get("cta") ?? "").trim();
    const designNotes = String(form.get("designNotes") ?? "").trim();
    const proofApproved = selectedOption.requiresFinalProof ? false : form.get("proofApproved") === "on";
    const manualCollectionAcknowledged = selectedOption.requiresManualCollection ? form.get("manualCollectionAcknowledged") === "on" : false;

    if (!isHttpUrl(destinationUrl)) {
      setError("Enter a valid destination link starting with http or https.");
      return;
    }

    if (selectedOption.requiresBusinessName && !businessName) {
      setError("Business name is required for this setup.");
      return;
    }

    if (selectedOption.requiresCustomText && !headline) {
      setError("Headline or main stand text is required for this setup.");
      return;
    }

    if (selectedOption.requiresManualCollection && !manualCollectionAcknowledged) {
      setError("Confirm that Tap Rater will collect logo/design details and send a final proof before printing.");
      return;
    }

    if (!selectedOption.requiresFinalProof && !proofApproved) {
      setError("Confirm the direct setup details before adding this stand to cart.");
      return;
    }

    cart.addItem({
      productId: product.slug,
      optionId: selectedOption.id,
      quantity: 1,
      productSnapshot: {
        title: product.title,
        sku: product.sku,
        shortDescription: product.shortDescription
      },
      setup: {
        destinationUrl,
        businessName,
        headline,
        cta,
        designNotes,
        proofApproved,
        manualCollectionAcknowledged
      }
    });
    router.push("/cart");
  }

  return (
    <form className="grid gap-4 rounded-[18px] border border-line bg-white p-4 shadow-sm sm:p-5" onSubmit={submit}>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.12em] text-brand">Choose setup</p>
        <h2 className="mt-2 text-xl font-extrabold text-ink">Configure this stand</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Your NFC and QR code connect directly to the link you provide. If the link changes after production, replacement or reprogramming may be required.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.id}
            className={
              selectedOptionId === option.id
                ? "grid cursor-pointer gap-3 rounded-[14px] border border-brand bg-white p-4 shadow-sm"
                : "grid cursor-pointer gap-3 rounded-[14px] border border-line bg-white p-4 hover:border-ink"
            }
          >
            <span className="grid gap-3">
                <input
                  className="sr-only"
                  type="radio"
                  name="setupOption"
                  value={option.id}
                  checked={selectedOptionId === option.id}
                  onChange={() => setSelectedOptionId(option.id)}
                />
                <span className="block font-black text-ink">{option.label}</span>
                <span className="block text-sm leading-5 text-muted">{option.summary}</span>
              <span className="text-sm font-black text-ink">{formatPrice(option.priceCents)}</span>
            </span>
          </label>
        ))}
        {product.categorySlug === "custom-stands" ? (
          <div className="rounded-[14px] border border-dashed border-line bg-[#f7f8fa] p-4 md:col-span-2">
            <p className="text-sm font-black text-ink">Hosted Multi-Link Page</p>
            <p className="mt-1 text-sm leading-6 text-muted">Coming soon. Use support for hosted multi-link or subscription setup requests.</p>
          </div>
        ) : null}
      </div>

      <label className="grid gap-2 text-sm font-bold text-ink">
        Destination link
        <input className="rounded-full border border-line px-4 py-3 font-normal outline-none focus:border-brand" name="destinationUrl" type="url" placeholder="https://example.com/review" required />
      </label>

      {selectedOption.requiresBusinessName ? (
        <label className="grid gap-2 text-sm font-bold text-ink">
          Business name
          <input className="rounded-full border border-line px-4 py-3 font-normal outline-none focus:border-brand" name="businessName" placeholder="Your business name" required />
        </label>
      ) : null}

      {selectedOption.requiresLogo ? (
        <div className="rounded-[14px] border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-black text-ink">Logo collection</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            After checkout, we will contact you to collect your logo and confirm the final proof before printing. No logo file is uploaded or stored in this checkout.
          </p>
        </div>
      ) : null}

      {selectedOption.requiresCustomText ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-ink">
            Headline or main stand text
            <input className="rounded-full border border-line px-4 py-3 font-normal outline-none focus:border-brand" name="headline" placeholder="Tap to connect" required />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink">
            CTA sentence
            <input className="rounded-full border border-line px-4 py-3 font-normal outline-none focus:border-brand" name="cta" placeholder="Scan or tap below" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink md:col-span-2">
            Design notes
            <textarea
              className="min-h-24 rounded-[14px] border border-line px-4 py-3 font-normal outline-none focus:border-brand"
              name="designNotes"
              placeholder="Describe logo placement, center graphic, color requests, or anything Tap Rater should confirm before printing."
            />
          </label>
        </div>
      ) : null}

      <div className="rounded-[14px] border border-line bg-[#f7f8fa] p-4">
        <p className="text-sm font-black text-ink">{selectedOption.requiresFinalProof ? "Manual proof required" : "Direct setup confirmation"}</p>
        {selectedOption.requiresFinalProof ? (
          <>
            <p className="mt-1 text-sm leading-6 text-muted">
              After checkout, Tap Rater will collect your logo/design details by email and send a final proof. Do not print until the logo/design is collected and the proof is approved.
            </p>
            <label className="mt-3 flex items-start gap-3 text-sm font-bold text-ink">
              <input className="mt-1" type="checkbox" name="manualCollectionAcknowledged" required />
              I understand Tap Rater will contact me for logo/design confirmation before printing.
            </label>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm leading-6 text-muted">
              Confirm the destination link for this standard direct stand before adding it to cart.
            </p>
            <label className="mt-3 flex items-start gap-3 text-sm font-bold text-ink">
              <input className="mt-1" type="checkbox" name="proofApproved" required />
              I confirm the direct setup details for this stand.
            </label>
          </>
        )}
      </div>

      {error ? <p className="rounded-[14px] border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <button className="inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-5 text-sm font-black text-white transition hover:bg-brand">
        Add configured stand to cart
      </button>
    </form>
  );
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
