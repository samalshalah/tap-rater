"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckCircle2, Search, UploadCloud, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import type { MigratedProduct } from "@/data/migrated-products";
import { formatPrice } from "@/lib/products";
import { getProductPurchaseOptions, type PurchaseOption, type PurchaseOptionId } from "@/lib/purchase-options";
import { createQrSvg, QR_CODE_ERROR_MESSAGE } from "@/lib/qr-code";

export type ProductSetupChooserProduct = Pick<
  MigratedProduct,
  | "slug"
  | "title"
  | "sku"
  | "shortDescription"
  | "categorySlug"
  | "allowsCustomDesign"
  | "isSpecialSolution"
  | "productKind"
  | "purchaseOptions"
  | "requiresLandingPage"
  | "requiresSubscription"
  | "primaryPlatformSlug"
  | "destinationType"
  | "displayText"
  | "defaultCtaText"
  | "images"
  | "assetSet"
>;

type SetupStep = "choose" | "destination" | "design" | "review";

type ProductSetupChooserProps = {
  product: ProductSetupChooserProduct;
  selectedOptionId?: PurchaseOptionId;
  onSelectedOptionChange?: (optionId: PurchaseOptionId) => void;
};

type UploadedLogo = {
  mediaUrl: string;
  storageKey: string;
  filename: string;
};

type GooglePlaceResult = {
  placeId: string;
  name: string;
  formattedAddress: string;
  reviewUrl: string;
};

export function ProductSetupChooser({ product, selectedOptionId: controlledSelectedOptionId, onSelectedOptionChange }: ProductSetupChooserProps) {
  const options = useMemo(() => getProductPurchaseOptions(product), [product]);
  const [uncontrolledSelectedOptionId, setUncontrolledSelectedOptionId] = useState<PurchaseOptionId>(options[0]?.id ?? "standard_direct");
  const [step, setStep] = useState<SetupStep>("choose");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [googleSearchQuery, setGoogleSearchQuery] = useState("");
  const [googleResults, setGoogleResults] = useState<GooglePlaceResult[]>([]);
  const [googleSearchMessage, setGoogleSearchMessage] = useState("");
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
  const [googlePlaceId, setGooglePlaceId] = useState("");
  const [googlePlaceName, setGooglePlaceName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [logo, setLogo] = useState<UploadedLogo | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [proofApproved, setProofApproved] = useState(false);
  const [error, setError] = useState("");
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const cart = useCart();
  const router = useRouter();
  const requestedOptionId = controlledSelectedOptionId ?? uncontrolledSelectedOptionId;
  const selectedOption = options.find((option) => option.id === requestedOptionId) ?? options[0];
  const selectedOptionId = selectedOption?.id;
  const isGoogleReviewProduct = isGoogleReviewStand(product);
  const selectedImage = selectedOption ? getSelectedOptionImage(product, selectedOption) : undefined;
  const brandedFrontTemplateUrl = product.assetSet?.brandedFrontTemplateUrl ?? product.assetSet?.standardFrontTemplateUrl ?? "";
  const ctaText = product.defaultCtaText || product.displayText || inferCtaText(product);
  const generatedQrValue = destinationUrl.trim();
  const isHosted = selectedOption?.id === "hosted_multilink";

  useEffect(() => {
    if (!isBuilderOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isBuilderOpen]);

  if (!selectedOption || !selectedImage) {
    return (
      <div className="rounded-[18px] border border-line bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">Choose setup</p>
        <h2 className="mt-3 text-2xl font-black text-ink">Checkout is not available yet</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          This stand does not have an active backend purchase option. Please contact support or choose another ready stand.
        </p>
      </div>
    );
  }

  function chooseOption(optionId: PurchaseOptionId) {
    setUncontrolledSelectedOptionId(optionId);
    onSelectedOptionChange?.(optionId);
    window.dispatchEvent(
      new CustomEvent("taprater:product-option-change", {
        detail: {
          productSlug: product.slug,
          optionId
        }
      })
    );
    setError("");
    setProofApproved(false);
    setStep("choose");
  }

  function openBuilder(optionId: PurchaseOptionId) {
    chooseOption(optionId);
    const option = options.find((item) => item.id === optionId);

    if (option?.id === "hosted_multilink") {
      setError("Hosted Multi-Link builder is coming next. Choose Standard Direct or Branded + QR Direct for this checkout.");
      return;
    }

    setStep("destination");
    setError("");
    setIsBuilderOpen(true);
  }

  function closeBuilder() {
    setIsBuilderOpen(false);
    setError("");
  }

  function continueFromChoice() {
    setError("");

    if (isHosted) {
      setError("Hosted Multi-Link builder is coming next. Choose Standard Direct or Branded + QR Direct for this checkout.");
      return;
    }

    setStep("destination");
  }

  async function searchGooglePlaces() {
    setError("");
    setGoogleSearchMessage("");
    setGoogleResults([]);

    if (googleSearchQuery.trim().length < 3) {
      setError("Search for a business name or address, or paste your Google review link manually.");
      return;
    }

    setIsSearchingGoogle(true);

    try {
      const response = await fetch(`/api/setup/google-places?q=${encodeURIComponent(googleSearchQuery.trim())}`);
      const body = await response.json().catch(() => ({}));

      if (!response.ok || body.ok === false) {
        setGoogleSearchMessage("Search is unavailable right now. Paste your Google review link manually.");
        return;
      }

      setGoogleResults(Array.isArray(body.results) ? body.results : []);
      setGoogleSearchMessage(body.message ?? (body.results?.length ? "" : "No matching businesses found. Paste your Google review link manually."));
    } catch {
      setGoogleSearchMessage("Search is unavailable right now. Paste your Google review link manually.");
    } finally {
      setIsSearchingGoogle(false);
    }
  }

  function useGooglePlace(place: GooglePlaceResult) {
    setGooglePlaceId(place.placeId);
    setGooglePlaceName(place.name);
    setDestinationUrl(place.reviewUrl);
    setBusinessName((current) => current || place.name);
    setGoogleSearchMessage("");
    setError("");
  }

  function continueFromDestination() {
    setError("");

    if (!isHttpUrl(destinationUrl)) {
      setError("Enter a valid destination link starting with http or https.");
      return;
    }

    setProofApproved(false);
    setStep(selectedOption.id === "branded_qr_direct" ? "design" : "review");
  }

  async function uploadLogo(file: File | undefined) {
    setError("");

    if (!file) {
      return;
    }

    const form = new FormData();
    form.set("file", file);
    form.set("productSlug", product.slug);
    setIsUploadingLogo(true);

    try {
      const response = await fetch("/api/setup/logo-upload", {
        method: "POST",
        body: form
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok || !body.asset?.mediaUrl || !body.asset?.storageKey) {
        setLogo(null);
        setError(body.error ?? "Logo upload failed. Use a PNG, JPG, or WEBP image up to 10 MB.");
        return;
      }

      setLogo({
        mediaUrl: body.asset.mediaUrl,
        storageKey: body.asset.storageKey,
        filename: body.asset.filename ?? file.name
      });
    } catch {
      setLogo(null);
      setError("Logo upload failed. Please try again.");
    } finally {
      setIsUploadingLogo(false);
    }
  }

  function continueFromDesign() {
    setError("");

    if (!businessName.trim()) {
      setError("Enter the business name that should appear on the stand.");
      return;
    }

    if (!logo) {
      setError("Upload your business logo before reviewing the front proof.");
      return;
    }

    setProofApproved(false);
    setStep("review");
  }

  function addConfiguredItemToCart() {
    setError("");

    if (!isHttpUrl(destinationUrl)) {
      setError("Enter a valid destination link starting with http or https.");
      setStep("destination");
      return;
    }

    if (selectedOption.id === "branded_qr_direct") {
      if (!businessName.trim()) {
        setError("Enter the business name that should appear on the stand.");
        setStep("design");
        return;
      }

      if (!logo) {
        setError("Upload your business logo before adding this stand to cart.");
        setStep("design");
        return;
      }

      if (!proofApproved) {
        setError("Confirm the front proof preview before adding this stand to cart.");
        return;
      }
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
        productSlug: product.slug,
        optionCode: selectedOption.id,
        destinationUrl: destinationUrl.trim(),
        destinationType: product.destinationType,
        platformSlug: product.primaryPlatformSlug,
        googlePlaceId: googlePlaceId || undefined,
        googlePlaceName: googlePlaceName || undefined,
        businessName: selectedOption.requiresBusinessName ? businessName.trim() : undefined,
        logoFileName: logo?.filename,
        logoMediaUrl: logo?.mediaUrl,
        logoStorageKey: logo?.storageKey,
        generatedQrValue: selectedOption.hasQr ? generatedQrValue : undefined,
        frontTemplateUrl: selectedOption.hasQr ? brandedFrontTemplateUrl || undefined : undefined,
        proofPreviewData:
          selectedOption.id === "branded_qr_direct"
            ? {
                productTitle: product.title,
                businessName: businessName.trim(),
                logoMediaUrl: logo?.mediaUrl,
                qrValue: generatedQrValue,
                ctaText,
                frontTemplateUrl: brandedFrontTemplateUrl || undefined
              }
            : undefined,
        hasQr: selectedOption.hasQr,
        nfcOnly: !selectedOption.hasQr,
        priceCents: selectedOption.priceCents,
        proofApproved: selectedOption.id === "branded_qr_direct" ? proofApproved : true
      }
    });
    router.push("/cart");
  }

  const modalTitle = selectedOption.id === "branded_qr_direct" ? "Build Your Branded QR Stand" : "Set up your Standard Direct Stand";
  const stepLabels = selectedOption.id === "branded_qr_direct" ? ["Destination", "Logo + name", "Proof"] : ["Destination", "Confirm"];
  const activeStepIndex = selectedOption.id === "branded_qr_direct"
    ? step === "destination"
      ? 0
      : step === "design"
        ? 1
        : 2
    : step === "destination"
      ? 0
      : 1;

  return (
    <>
      <section className="grid gap-4 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">Choose setup</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">Choose how to build this stand</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Choose NFC only for one direct link, or add a printed QR with logo, business name, and proof approval before cart.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {options
            .filter((option) => option.id !== "hosted_multilink")
            .map((option) => (
              <article
                key={option.id}
                className={
                  selectedOptionId === option.id
                    ? "grid gap-4 rounded-2xl border border-brand bg-white p-4 shadow-sm"
                    : "grid gap-4 rounded-2xl border border-line bg-white p-4"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-ink">{option.label}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">{getOptionSummary(option)}</p>
                  </div>
                  <p className="text-lg font-semibold text-ink">{formatPrice(option.priceCents).replace(".00", "")}</p>
                </div>
                <div className="grid gap-2 text-sm text-muted">
                  <p className="inline-flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-brand" />
                    {option.hasQr ? "NFC + printed QR" : "NFC only"}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-brand" />
                    {option.hasQr ? "Logo + business name" : "No printed QR"}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-brand" />
                    {option.hasQr ? "Proof before cart" : "One direct destination link"}
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-auto inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-brand"
                  onClick={() => openBuilder(option.id)}
                >
                  {option.id === "branded_qr_direct" ? "Build Branded Stand" : "Set up Standard"}
                </button>
              </article>
            ))}
        </div>

        {options.some((option) => option.id === "hosted_multilink") ? (
          <div className="rounded-[14px] border border-dashed border-line bg-[#f7f8fa] p-4">
            <p className="text-sm font-semibold text-ink">Hosted Multi-Link is coming soon</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Multi-Link will be its own builder later. This product supports Standard Direct and Branded + QR checkout today.
            </p>
          </div>
        ) : null}

        {error && !isBuilderOpen ? <p className="rounded-[14px] border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      </section>

      {isBuilderOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 px-3 py-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={modalTitle}>
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_28px_80px_rgba(17,24,39,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-4 sm:px-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">{product.title}</p>
                <h2 className="mt-1 text-2xl font-semibold text-ink">{modalTitle}</h2>
              </div>
              <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-ink hover:border-ink" onClick={closeBuilder} aria-label="Close builder">
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-line px-4 py-3 sm:px-6">
              <ol className="grid gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-muted sm:grid-cols-3">
                {stepLabels.map((label, index) => (
                  <li key={label} className={index <= activeStepIndex ? "rounded-full bg-ink px-3 py-2 text-white" : "rounded-full border border-line px-3 py-2"}>
                    {label}
                  </li>
                ))}
              </ol>
            </div>

            <div className="overflow-y-auto px-4 py-4 sm:px-6">
              {step === "destination" ? (
                <div className="grid gap-4">
                  <BuilderSummary image={selectedImage} option={selectedOption} productTitle={product.title} />
                  <div>
                    <p className="text-sm font-semibold text-ink">Destination link</p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {isGoogleReviewProduct
                        ? "Search for your Google Business Profile or paste your Google review link manually."
                        : "Paste the URL this stand should open when customers tap."}
                    </p>
                  </div>

                  {isGoogleReviewProduct ? (
                    <div className="grid gap-3 rounded-[14px] border border-line bg-[#f7f8fa] p-4">
                      <label className="grid gap-2 text-sm font-semibold text-ink">
                        Google Business search
                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                          <input
                            className="min-w-0 rounded-full border border-line bg-white px-4 py-3 font-normal outline-none focus:border-brand"
                            value={googleSearchQuery}
                            onChange={(event) => setGoogleSearchQuery(event.target.value)}
                            placeholder="Business name and city"
                          />
                          <button
                            type="button"
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-brand disabled:bg-gray-300"
                            disabled={isSearchingGoogle}
                            onClick={searchGooglePlaces}
                          >
                            <Search size={16} />
                            {isSearchingGoogle ? "Searching" : "Search"}
                          </button>
                        </div>
                      </label>

                      {googleSearchMessage ? <p className="text-sm font-semibold text-muted">{googleSearchMessage}</p> : null}
                      {googleResults.length ? (
                        <div className="grid gap-2">
                          {googleResults.map((place) => (
                            <button
                              key={place.placeId}
                              type="button"
                              className="rounded-[12px] border border-line bg-white p-3 text-left hover:border-brand"
                              onClick={() => useGooglePlace(place)}
                            >
                              <span className="block text-sm font-semibold text-ink">{place.name}</span>
                              {place.formattedAddress ? <span className="block text-xs leading-5 text-muted">{place.formattedAddress}</span> : null}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    {isGoogleReviewProduct ? "Manual Google review link" : "Destination URL"}
                    <input
                      className="rounded-full border border-line bg-white px-4 py-3 font-normal outline-none focus:border-brand"
                      type="url"
                      value={destinationUrl}
                      onChange={(event) => {
                        setDestinationUrl(event.target.value);
                        setGooglePlaceId("");
                        setGooglePlaceName("");
                      }}
                      placeholder={isGoogleReviewProduct ? "https://search.google.com/local/writereview?placeid=..." : "https://example.com"}
                    />
                  </label>

                  {googlePlaceName ? (
                    <p className="rounded-[12px] border border-teal-100 bg-teal-50 p-3 text-sm font-semibold text-brand">
                      Selected Google business: {googlePlaceName}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {step === "design" && selectedOption.id === "branded_qr_direct" ? (
                <div className="grid gap-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">Logo + business name</p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      Upload the logo and enter the exact business name for the printed front proof.
                    </p>
                  </div>

                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    Printed business name
                    <input
                      className="rounded-full border border-line bg-white px-4 py-3 font-normal outline-none focus:border-brand"
                      value={businessName}
                      onChange={(event) => setBusinessName(event.target.value)}
                      placeholder="Your business name"
                    />
                  </label>

                  <div className="grid gap-3 rounded-[14px] border border-line bg-[#f7f8fa] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">Business logo</p>
                        <p className="mt-1 text-xs leading-5 text-muted">PNG, JPG, or WEBP up to 10 MB. SVG is not accepted here.</p>
                      </div>
                      {logo ? <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-brand">Logo uploaded</span> : null}
                    </div>
                    <label className="grid min-h-32 cursor-pointer place-items-center rounded-[14px] border border-dashed border-line bg-white p-4 text-center text-sm font-medium text-muted hover:border-brand">
                      <UploadCloud className="mb-2 h-6 w-6" />
                      {isUploadingLogo ? "Uploading logo..." : logo ? logo.filename : "Upload logo"}
                      <input
                        className="sr-only"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={isUploadingLogo}
                        onChange={(event) => uploadLogo(event.target.files?.[0])}
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {step === "review" ? (
                <div className="grid gap-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">{selectedOption.id === "branded_qr_direct" ? "Proof preview" : "Confirm setup"}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {selectedOption.id === "branded_qr_direct"
                        ? "This is the printed front proof. Confirm the logo, business name, and QR placement before adding to cart."
                        : "Confirm the direct destination link before adding this NFC-only stand to cart."}
                    </p>
                  </div>

                  <div className="grid gap-2 rounded-[14px] border border-line bg-[#f7f8fa] p-4 text-sm text-muted">
                    <ReviewLine label="Product" value={product.title} />
                    <ReviewLine label="Setup" value={selectedOption.label} />
                    <ReviewLine label="Price" value={formatPrice(selectedOption.priceCents)} />
                    <ReviewLine label="Connection" value={selectedOption.hasQr ? "NFC + printed QR" : "NFC only; no printed QR"} />
                    <ReviewLine label="Destination link" value={destinationUrl || "-"} />
                    {googlePlaceName ? <ReviewLine label="Google business" value={googlePlaceName} /> : null}
                    {selectedOption.id === "branded_qr_direct" ? (
                      <>
                        <ReviewLine label="Business name" value={businessName || "-"} />
                        <ReviewLine label="Logo" value={logo ? "Logo uploaded" : "Missing"} />
                        <ReviewLine label="QR" value={generatedQrValue ? "QR generated from destination link" : "Missing"} />
                      </>
                    ) : null}
                  </div>

                  {selectedOption.id === "branded_qr_direct" ? (
                    <>
                      <ProofPreview
                        businessName={businessName}
                        ctaText={ctaText}
                        logo={logo}
                        product={product}
                        qrValue={generatedQrValue}
                        templateUrl={brandedFrontTemplateUrl}
                      />
                      <label className="flex items-start gap-3 rounded-[12px] border border-line bg-white p-3 text-sm font-semibold text-ink">
                        <input className="mt-1" type="checkbox" checked={proofApproved} onChange={(event) => setProofApproved(event.target.checked)} />
                        I reviewed the front proof preview and confirm these branded setup details.
                      </label>
                    </>
                  ) : (
                    <div className="rounded-[12px] border border-line bg-white p-3 text-sm leading-6 text-muted">
                      <p className="font-semibold text-ink">Standard Direct confirmation</p>
                      <p>This stand is NFC only, has no printed QR, and opens the destination link above.</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="border-t border-line bg-white px-4 py-4 sm:px-6">
              {error ? <p className="mb-3 rounded-[14px] border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  className="min-h-11 rounded-full border border-line px-5 text-sm font-semibold text-ink"
                  onClick={() => {
                    if (step === "destination") closeBuilder();
                    else setStep(selectedOption.id === "branded_qr_direct" && step === "review" ? "design" : "destination");
                  }}
                >
                  {step === "destination" ? "Cancel" : "Back"}
                </button>
                {step === "destination" ? (
                  <button type="button" className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-brand" onClick={continueFromDestination}>
                    {selectedOption.id === "branded_qr_direct" ? "Continue to logo" : "Review setup"}
                  </button>
                ) : null}
                {step === "design" && selectedOption.id === "branded_qr_direct" ? (
                  <button type="button" className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-brand" onClick={continueFromDesign}>
                    Preview proof
                  </button>
                ) : null}
                {step === "review" ? (
                  <button type="button" className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-brand" onClick={addConfiguredItemToCart}>
                    Add to cart
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function BuilderSummary({ image, productTitle, option }: { image: { src: string; alt: string }; productTitle: string; option: PurchaseOption }) {
  return (
    <div className="grid gap-3 rounded-[14px] border border-line bg-[#f7f8fa] p-3 sm:grid-cols-[96px_1fr] sm:items-center">
      <div className="relative aspect-square overflow-hidden rounded-[12px] bg-white">
        <Image src={image.src} alt={image.alt} fill unoptimized className="object-contain p-2" />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">{productTitle}</p>
        <p className="mt-1 text-sm text-muted">{option.label} · {formatPrice(option.priceCents)}</p>
        <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.05em] text-brand">
          <CheckCircle2 size={14} />
          {option.hasQr ? "NFC + printed QR" : "NFC only, no printed QR"}
        </p>
      </div>
    </div>
  );
}

function ProofPreview({
  businessName,
  ctaText,
  logo,
  product,
  qrValue,
  templateUrl
}: {
  businessName: string;
  ctaText: string;
  logo: UploadedLogo | null;
  product: ProductSetupChooserProduct;
  qrValue: string;
  templateUrl: string;
}) {
  return (
    <div className="rounded-[14px] border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black text-ink">Front proof preview</p>
        <p className="text-xs font-bold text-muted">QR generated from destination link</p>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px] md:items-start">
        {templateUrl ? (
          <TemplateProofPreview businessName={businessName} logo={logo} qrValue={qrValue} templateUrl={templateUrl} />
        ) : (
          <CleanProofPreview businessName={businessName} ctaText={ctaText} logo={logo} product={product} qrValue={qrValue} />
        )}
        <div className="grid gap-3 text-sm text-muted">
          {templateUrl ? <ReviewLine label="Template" value="Branded front template attached" /> : <ReviewLine label="Template" value="Clean proof layout shown" />}
          <ReviewLine label="Logo" value={logo ? "Logo uploaded" : "Upload required"} />
          <ReviewLine label="QR" value={qrValue ? "QR generated from destination link" : "Add destination first"} />
        </div>
      </div>
    </div>
  );
}

function TemplateProofPreview({
  businessName,
  logo,
  qrValue,
  templateUrl
}: {
  businessName: string;
  logo: UploadedLogo | null;
  qrValue: string;
  templateUrl: string;
}) {
  return (
    <div className="relative mx-auto aspect-[1278/1949] w-full max-w-[270px] overflow-hidden rounded-[16px] border border-line bg-white shadow-sm">
      <img src={templateUrl} alt="Branded front template proof" className="absolute inset-0 h-full w-full object-contain" />
      <div className="absolute left-[13%] top-[4.5%] grid h-[9.5%] w-[74%] place-items-center">
        {logo ? (
          <img src={logo.mediaUrl} alt="Uploaded business logo" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="rounded-full border border-dashed border-line bg-white/90 px-3 py-1 text-[9px] font-black uppercase text-muted">Logo zone</span>
        )}
      </div>
      <p className="absolute left-[8%] top-[17.1%] w-[84%] overflow-hidden text-center text-[11px] font-black uppercase leading-tight text-ink">
        {businessName || "Business name"}
      </p>
      <div className="absolute left-[65.2%] top-[73.1%] aspect-square w-[16.2%]">
        <QrPreview value={qrValue} variant="template" />
      </div>
    </div>
  );
}

function CleanProofPreview({
  businessName,
  ctaText,
  logo,
  product,
  qrValue
}: {
  businessName: string;
  ctaText: string;
  logo: UploadedLogo | null;
  product: ProductSetupChooserProduct;
  qrValue: string;
}) {
  return (
    <div className="mx-auto grid aspect-[0.68] w-full max-w-[270px] justify-items-center rounded-[16px] border border-line bg-white p-5 text-center shadow-sm">
      <div className="grid min-h-16 w-full place-items-center rounded-[12px] border border-dashed border-line bg-[#f7f8fa] p-2">
        {logo ? <img src={logo.mediaUrl} alt="Uploaded business logo" className="max-h-14 max-w-[80%] object-contain" /> : <span className="text-xs font-black uppercase text-muted">Logo zone</span>}
      </div>
      <p className="mt-3 max-w-full break-words text-sm font-black uppercase text-ink">{businessName || "Business name"}</p>
      <div className="mt-5 grid justify-items-center gap-2">
        <p className="text-5xl font-black text-brand">{platformMark(product)}</p>
        <p className="text-sm font-black text-ink">{ctaText}</p>
      </div>
      <div className="mt-5 grid w-full grid-cols-2 items-end gap-5">
        <div className="grid justify-items-center gap-1">
          <div className="text-4xl font-black">⌁</div>
          <p className="text-[10px] font-black uppercase leading-tight text-ink">Contactless<br />tapping</p>
        </div>
        <div className="grid justify-items-center gap-1">
          <QrPreview value={qrValue} />
          <p className="text-[10px] font-black uppercase text-ink">Scan</p>
        </div>
      </div>
      <p className="mt-auto border-t border-ink px-8 pt-2 text-xs font-black uppercase text-ink">Tap Rater</p>
    </div>
  );
}

function QrPreview({ value, variant = "framed" }: { value: string; variant?: "framed" | "template" }) {
  const [qrSvg, setQrSvg] = useState("");
  const [qrError, setQrError] = useState("");
  const className =
    variant === "template"
      ? "grid h-full w-full place-items-center bg-white p-[3px]"
      : "grid h-20 w-20 place-items-center border-4 border-ink bg-white p-1";

  useEffect(() => {
    let isActive = true;

    setQrSvg("");
    setQrError("");

    createQrSvg(value)
      .then((svg) => {
        if (isActive) setQrSvg(svg);
      })
      .catch(() => {
        if (isActive) setQrError(QR_CODE_ERROR_MESSAGE);
      });

    return () => {
      isActive = false;
    };
  }, [value]);

  if (qrError) {
    return (
      <div className={`${className} text-center text-[6px] font-black leading-tight text-red-700`} role="alert">
        {QR_CODE_ERROR_MESSAGE}
      </div>
    );
  }

  if (!qrSvg) {
    return (
      <div className={`${className} text-center text-[7px] font-black uppercase leading-tight text-muted`} aria-label="Generating QR code">
        Generating QR
      </div>
    );
  }

  return (
    <div className={className} aria-label="Generated QR code">
      <div className="h-full w-full [&_svg]:block [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
    </div>
  );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <strong className="text-ink">{label}:</strong> {value}
    </p>
  );
}

function getSelectedOptionImage(product: ProductSetupChooserProduct, option: PurchaseOption): { src: string; alt: string } {
  if (option.id === "branded_qr_direct" && product.assetSet?.brandedAngledImageUrl) {
    return { src: product.assetSet.brandedAngledImageUrl, alt: `${product.title} branded option` };
  }

  return product.images[0] ?? { src: "/uploads/products/no-photo-available.png", alt: product.title };
}

function inferCtaText(product: ProductSetupChooserProduct) {
  if (product.primaryPlatformSlug === "google") return "Review us on Google";
  if (product.destinationType === "booking") return "Book your appointment";
  if (product.categorySlug === "menu") return "View our menu";
  return product.title.replace(/\s+Stand$/i, "");
}

function isGoogleReviewStand(product: ProductSetupChooserProduct) {
  const searchableText = `${product.slug} ${product.title} ${product.categorySlug} ${product.destinationType ?? ""} ${product.primaryPlatformSlug ?? ""}`.toLowerCase();
  return searchableText.includes("google") && searchableText.includes("review");
}

function getOptionSummary(option: PurchaseOption) {
  if (option.id === "branded_qr_direct") {
    return "NFC + printed QR stand with logo, business name, and front proof before cart.";
  }

  return "NFC-only stand connected to one direct destination link. No printed QR.";
}

function platformMark(product: ProductSetupChooserProduct) {
  const platform = product.primaryPlatformSlug?.trim();
  if (platform === "google") return "G";
  if (platform === "yelp") return "Y";
  if (platform === "tripadvisor") return "T";
  if (platform === "facebook") return "f";
  return product.displayText?.slice(0, 1).toUpperCase() || "T";
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
