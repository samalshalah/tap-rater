"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckCircle2, Search, UploadCloud, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import type { MigratedProduct } from "@/data/migrated-products";
import { brandedStandComposition, type BrandedCompositionRegion } from "@/lib/branded-composition";
import { formatPrice } from "@/lib/products";
import { getProductPurchaseOptions, isHostedPurchaseOptionEnabled, type PurchaseOption, type PurchaseOptionId } from "@/lib/purchase-options";
import { generateProductVariantSku, getConfiguredUnitPriceCents, getDefaultProductColor, getDefaultProductSize, getProductBaseSku } from "@/lib/product-model";
import { createQrSvg, QR_CODE_ERROR_MESSAGE } from "@/lib/qr-code";
import { buildDirectProductionTargets, buildProofApprovalSnapshot, isProofApprovalSnapshotCurrent, type ProofApprovalSnapshot } from "@/lib/direct-production";
import { hostedMultiLinkServiceAddon, productSupportsMultiLink } from "@/lib/service-addons";

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
  | "supportsMultiLink"
  | "primaryPlatformSlug"
  | "destinationType"
  | "displayText"
  | "defaultCtaText"
  | "images"
  | "assetSet"
  | "sizeOptions"
  | "colorOptions"
>;

type SetupStep = "choose" | "destination" | "design" | "review";
type LinkExperienceId = "direct" | "multilink";

type ProductSetupChooserProps = {
  product: ProductSetupChooserProduct;
  selectedOptionId?: PurchaseOptionId;
  onSelectedOptionChange?: (optionId: PurchaseOptionId) => void;
  onSelectedPriceChange?: (priceCents: number | null) => void;
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

export function ProductSetupChooser({ product, selectedOptionId: controlledSelectedOptionId, onSelectedOptionChange, onSelectedPriceChange }: ProductSetupChooserProps) {
  const options = useMemo(() => getProductPurchaseOptions(product), [product]);
  const [uncontrolledSelectedOptionId, setUncontrolledSelectedOptionId] = useState<PurchaseOptionId>(options[0]?.id ?? "standard_direct");
  const [selectedLinkExperience, setSelectedLinkExperience] = useState<LinkExperienceId>("direct");
  const [step, setStep] = useState<SetupStep>("choose");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [googleSearchQuery, setGoogleSearchQuery] = useState("");
  const [selectedGoogleSearchQuery, setSelectedGoogleSearchQuery] = useState("");
  const [googleResults, setGoogleResults] = useState<GooglePlaceResult[]>([]);
  const [googleSearchMessage, setGoogleSearchMessage] = useState("");
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
  const [googlePlaceId, setGooglePlaceId] = useState("");
  const [googlePlaceName, setGooglePlaceName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [logo, setLogo] = useState<UploadedLogo | null>(null);
  const [selectedSizeCode, setSelectedSizeCode] = useState(() => getDefaultProductSize(product)?.code ?? "");
  const [selectedColorCode, setSelectedColorCode] = useState(() => getDefaultProductColor(product)?.code ?? "");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [proofApproved, setProofApproved] = useState(false);
  const [approvedProofSnapshot, setApprovedProofSnapshot] = useState<ProofApprovalSnapshot | null>(null);
  const [error, setError] = useState("");
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const googleSearchRequestId = useRef(0);
  const cart = useCart();
  const router = useRouter();
  const requestedOptionId = controlledSelectedOptionId ?? uncontrolledSelectedOptionId;
  const selectedOption = options.find((option) => option.id === requestedOptionId) ?? options[0];
  const selectedOptionId = selectedOption?.id;
  const supportsMultiLink = productSupportsMultiLink(product);
  const hostedPurchasingEnabled = isHostedPurchaseOptionEnabled();
  const activeSizes = product.sizeOptions?.filter((size) => size.isActive) ?? [];
  const purchasableSizes = activeSizes.filter((size) => size.priceAdjustmentCents !== null);
  const defaultPurchasableSize =
    purchasableSizes.find((size) => size.isDefault) ?? purchasableSizes[0] ?? getDefaultProductSize(product);
  const selectedSize =
    purchasableSizes.find((size) => size.code === selectedSizeCode) ?? defaultPurchasableSize;
  const activeColors = product.colorOptions?.filter((color) => color.isActive) ?? [];
  const selectedColor = activeColors.find((color) => color.code === selectedColorCode) ?? getDefaultProductColor(product);
  const configuredUnitPriceCents = selectedOption
    ? getConfiguredUnitPriceCents(product, selectedOption, { sizeCode: selectedSize?.code, colorCode: selectedColor?.code })
    : null;
  const finalSku = selectedOption
    ? generateProductVariantSku(product, { purchaseOptionId: selectedOption.id, sizeCode: selectedSize?.code, colorCode: selectedColor?.code })
    : product.sku;
  const isGoogleReviewProduct = isGoogleReviewStand(product);
  const selectedImage = selectedOption ? getSelectedOptionImage(product, selectedOption) : undefined;
  const brandedFrontTemplateUrl = product.assetSet?.brandedFrontTemplateUrl ?? "";
  const setupOptions = options;
  const generatedQrValue = destinationUrl.trim();
  const directTargets = buildDirectProductionTargets(destinationUrl);
  const currentApprovalSnapshot = selectedOption
    ? buildProofApprovalSnapshot({
        productSlug: product.slug,
        optionCode: selectedOption.id,
        destinationUrl,
        businessName,
        logoStorageKey: logo?.storageKey,
        logoMediaUrl: logo?.mediaUrl,
        generatedQrValue,
        frontTemplateUrl: brandedFrontTemplateUrl || undefined
      })
    : undefined;
  const isApprovedConfigurationCurrent =
    selectedOption?.id !== "branded_qr_direct" ||
    (proofApproved && currentApprovalSnapshot && isProofApprovalSnapshotCurrent(currentApprovalSnapshot, approvedProofSnapshot));

  useEffect(() => {
    if (!isBuilderOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isBuilderOpen]);

  useEffect(() => {
    if (!isBuilderOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeBuilder();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBuilderOpen]);

  useEffect(() => {
    if (selectedOption?.id !== "branded_qr_direct" || !proofApproved) return;

    if (!currentApprovalSnapshot || !isProofApprovalSnapshotCurrent(currentApprovalSnapshot, approvedProofSnapshot)) {
      setProofApproved(false);
      setApprovedProofSnapshot(null);
    }
  }, [approvedProofSnapshot, currentApprovalSnapshot, proofApproved, selectedOption?.id]);

  useEffect(() => {
    if (!selectedSize || selectedSize.code === selectedSizeCode) return;
    setSelectedSizeCode(selectedSize.code);
  }, [selectedSize, selectedSizeCode]);

  useEffect(() => {
    onSelectedPriceChange?.(configuredUnitPriceCents);
  }, [configuredUnitPriceCents, onSelectedPriceChange]);

  useEffect(() => {
    if (!isGoogleReviewProduct || step !== "destination") return;

    const query = googleSearchQuery.trim();

    if (query.length < 3) {
      googleSearchRequestId.current += 1;
      setGoogleResults([]);
      setGoogleSearchMessage("");
      setIsSearchingGoogle(false);
      return;
    }

    if (query === selectedGoogleSearchQuery) return;

    const timeout = window.setTimeout(() => {
      void searchGooglePlaces(query, { showValidationError: false });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [googleSearchQuery, isGoogleReviewProduct, selectedGoogleSearchQuery, step]);

  if (!selectedOption || !selectedImage) {
    return (
      <div className="tr-card p-6">
        <p className="tr-eyebrow">Choose setup</p>
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
    setApprovedProofSnapshot(null);
    setStep("choose");
  }

  function openBuilder(optionId: PurchaseOptionId) {
    chooseOption(optionId);

    if (selectedLinkExperience === "multilink" && !hostedPurchasingEnabled) {
      setError("Multi-Link checkout is not available yet. Choose Direct for checkout now.");
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

  async function searchGooglePlaces(queryOverride?: string, options: { showValidationError?: boolean } = {}) {
    const query = (queryOverride ?? googleSearchQuery).trim();
    const showValidationError = options.showValidationError ?? true;
    const requestId = googleSearchRequestId.current + 1;
    googleSearchRequestId.current = requestId;

    setError("");
    setGoogleSearchMessage("");
    setGoogleResults([]);

    if (query.length < 3) {
      if (showValidationError) {
        setError("Search for a business name or address, or paste your Google review link manually.");
      }
      return;
    }

    setIsSearchingGoogle(true);

    try {
      const response = await fetch(`/api/setup/google-places?q=${encodeURIComponent(query)}`);
      const body = await response.json().catch(() => ({}));

      if (requestId !== googleSearchRequestId.current) return;

      if (!response.ok || body.ok === false) {
        setGoogleSearchMessage("Search is unavailable right now. Paste your Google review link manually.");
        return;
      }

      setGoogleResults(Array.isArray(body.results) ? body.results : []);
      setGoogleSearchMessage(body.message ?? (body.results?.length ? "" : "No matching businesses found. Paste your Google review link manually."));
    } catch {
      if (requestId !== googleSearchRequestId.current) return;
      setGoogleSearchMessage("Search is unavailable right now. Paste your Google review link manually.");
    } finally {
      if (requestId === googleSearchRequestId.current) {
        setIsSearchingGoogle(false);
      }
    }
  }

  function useGooglePlace(place: GooglePlaceResult) {
    const selectedQuery = `${place.name}${place.formattedAddress ? ` - ${place.formattedAddress}` : ""}`;
    setGooglePlaceId(place.placeId);
    setGooglePlaceName(place.name);
    setGoogleSearchQuery(selectedQuery);
    setSelectedGoogleSearchQuery(selectedQuery);
    setGoogleResults([]);
    setDestinationUrl(place.reviewUrl);
    setBusinessName((current) => current || place.name);
    setGoogleSearchMessage("");
    setError("");
    setProofApproved(false);
    setApprovedProofSnapshot(null);
  }

  function continueFromDestination() {
    setError("");

    if (configuredUnitPriceCents === null) {
      setError("This size is not available for purchase yet.");
      return;
    }

    if (selectedLinkExperience === "direct" && !isHttpUrl(destinationUrl)) {
      setError("Enter a valid destination link starting with http or https.");
      return;
    }

    setProofApproved(false);
    setApprovedProofSnapshot(null);
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
        setProofApproved(false);
        setApprovedProofSnapshot(null);
        setError(body.error ?? "Logo upload failed. Use a PNG, JPG, or WEBP image up to 10 MB.");
        return;
      }

      setLogo({
        mediaUrl: body.asset.mediaUrl,
        storageKey: body.asset.storageKey,
        filename: body.asset.filename ?? file.name
      });
      setProofApproved(false);
      setApprovedProofSnapshot(null);
    } catch {
      setLogo(null);
      setProofApproved(false);
      setApprovedProofSnapshot(null);
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

    if (!brandedFrontTemplateUrl) {
      setError("Branded artwork is not configured for this product yet.");
      return;
    }

    setProofApproved(false);
    setApprovedProofSnapshot(null);
    setStep("review");
  }

  function goToPreviousStep() {
    setError("");
    if (step === "review") {
      setStep(selectedOption.id === "branded_qr_direct" ? "design" : "destination");
      return;
    }

    if (step === "design") {
      setStep("destination");
    }
  }

  function addConfiguredItemToCart() {
    setError("");

    if (configuredUnitPriceCents === null) {
      setError("This size is not available for purchase yet.");
      return;
    }

    if (selectedLinkExperience === "direct" && !directTargets) {
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

      if (!brandedFrontTemplateUrl) {
        setError("Branded artwork is not configured for this product yet.");
        setStep("design");
        return;
      }

      if (!isApprovedConfigurationCurrent || !currentApprovalSnapshot) {
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
        sku: finalSku,
        baseSku: getProductBaseSku(product),
        finalSku,
        shortDescription: product.shortDescription
      },
      setup: {
        productSlug: product.slug,
        optionCode: selectedOption.id,
        baseSku: getProductBaseSku(product),
        finalSku,
        purchaseOptionLabel: selectedOption.label,
        sizeCode: selectedSize?.code,
        sizeLabel: selectedSize?.label,
        colorCode: selectedColor?.code,
        colorLabel: selectedColor?.label,
        destinationUrl: directTargets?.destinationUrl,
        destinationType: product.destinationType,
        serviceMode: selectedLinkExperience === "multilink" ? "HOSTED" : "DIRECT",
        serviceAddon: selectedLinkExperience === "multilink" ? hostedMultiLinkServiceAddon.code : undefined,
        monthlyPriceCents: selectedLinkExperience === "multilink" ? hostedMultiLinkServiceAddon.monthlyPriceCents : undefined,
        platformSlug: product.primaryPlatformSlug,
        googlePlaceId: googlePlaceId || undefined,
        googlePlaceName: googlePlaceName || undefined,
        businessName: selectedOption.requiresBusinessName ? businessName.trim() : undefined,
        logoFileName: logo?.filename,
        logoMediaUrl: logo?.mediaUrl,
        logoStorageKey: logo?.storageKey,
        generatedQrValue: directTargets?.qrTargetUrl,
        qrTargetUrl: directTargets?.qrTargetUrl,
        nfcTargetUrl: directTargets?.nfcTargetUrl,
        frontTemplateUrl: selectedOption.hasQr ? brandedFrontTemplateUrl || undefined : product.assetSet?.standardFrontTemplateUrl || undefined,
        proofApprovalSnapshot: selectedOption.id === "branded_qr_direct" ? approvedProofSnapshot ?? currentApprovalSnapshot : undefined,
        proofApprovedAt: selectedOption.id === "branded_qr_direct" ? new Date().toISOString() : undefined,
        proofPreviewData:
          selectedOption.id === "branded_qr_direct"
            ? {
                productTitle: product.title,
                businessName: businessName.trim(),
                logoMediaUrl: logo?.mediaUrl,
                qrValue: directTargets?.qrTargetUrl,
                frontTemplateUrl: brandedFrontTemplateUrl || undefined
              }
            : undefined,
        hasQr: true,
        nfcOnly: false,
        priceCents: configuredUnitPriceCents,
        proofApproved: selectedOption.id === "branded_qr_direct" ? proofApproved : true
      }
    });
    router.push("/cart");
  }

  const modalTitle =
    selectedOption.id === "branded_qr_direct"
        ? "Build your Branded QR stand"
        : "Set up your Standard Direct stand";
  const selectedPrice =
    configuredUnitPriceCents === null
        ? "Unavailable"
        : formatPrice(configuredUnitPriceCents).replace(".00", "");
  const stepLabels = selectedOption.id === "branded_qr_direct" ? ["Destination", "Logo + name", "Proof"] : ["Destination", "Confirm"];
  const stepGridClassName = selectedOption.id === "branded_qr_direct" ? "sm:grid-cols-3" : "sm:grid-cols-2";
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
      <section className="grid gap-4 border-t border-line pt-4">
        <div className="grid gap-2">
          <p className="text-sm font-black text-ink">Design</p>
          <div className="grid gap-3 sm:grid-cols-2">
          {setupOptions.map((option) => (
            <label
              key={option.id}
              className={
                selectedOptionId === option.id
                  ? "grid min-h-[96px] cursor-pointer grid-cols-[auto_1fr] gap-3 rounded-md border border-brand bg-panel p-3 transition"
                  : "grid min-h-[96px] cursor-pointer grid-cols-[auto_1fr] gap-3 rounded-md border border-line bg-white p-3 transition hover:border-brand/50 hover:bg-soft"
              }
            >
              <input
                type="radio"
                name={`${product.slug}-setup-option`}
                checked={selectedOptionId === option.id}
                onChange={() => chooseOption(option.id)}
                aria-label={`Select ${option.label}`}
                className="mt-1 h-4 w-4 accent-brand"
              />
              <span className="min-w-0">
                <span className="flex items-start justify-between gap-2">
                  <span className="text-base font-black leading-5 text-ink">{getOptionDisplayLabel(option)}</span>
                  <span className="shrink-0 text-sm font-black text-ink">{formatPrice(option.priceCents).replace(".00", "")}</span>
                </span>
                <span className="mt-1 block text-sm font-semibold leading-5 text-ink">{getOptionShortSummary(option)}</span>
                <span className="mt-1 block text-xs leading-5 text-muted">{getOptionSummary(option)}</span>
              </span>
            </label>
          ))}
          </div>
        </div>

        {activeSizes.length ? (
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-ink">Size</p>
            <div className="grid grid-cols-2 gap-2">
              {activeSizes.map((size) => {
                const pending = size.priceAdjustmentCents === null;
                return (
                  <label
                    key={size.code}
                    className={
                      pending
                        ? "flex cursor-not-allowed flex-col items-start gap-1 rounded-md border border-line bg-white px-3 py-2 opacity-55"
                        : selectedSize?.code === size.code
                          ? "flex cursor-pointer flex-col items-start gap-1 rounded-md border border-brand bg-panel px-3 py-2"
                          : "flex cursor-pointer flex-col items-start gap-1 rounded-md border border-line bg-white px-3 py-2 hover:border-brand/50"
                    }
                    aria-disabled={pending}
                  >
                    <span className="flex w-full min-w-0 items-center gap-2">
                      <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
                        <input
                          type="radio"
                          name={`${product.slug}-size`}
                          checked={selectedSize?.code === size.code}
                          disabled={pending}
                          onChange={() => {
                            if (!pending) setSelectedSizeCode(size.code);
                          }}
                          className="h-4 w-4 shrink-0 accent-brand"
                        />
                        <span className="min-w-0 truncate">{formatSizeLabel(size.label)}</span>
                      </span>
                    </span>
                    <span className="pl-6 text-[11px] leading-4 text-muted">
                        {size.frontWidthIn.toFixed(2)} x {size.frontHeightIn.toFixed(2)} in
                        <span className="mx-1 text-line">/</span>
                        {size.frontWidthMm} x {size.frontHeightMm} mm
                    </span>
                    <span className={pending ? "pl-6 text-[11px] font-semibold leading-4 text-muted" : "pl-6 text-[11px] font-semibold leading-4 text-brand"}>
                      {pending ? "Coming soon" : "Included"}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}

        {activeColors.length ? (
          <div className="grid gap-2">
            {activeColors.length === 1 ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-ink">Color</span>
                <span className="inline-flex h-4 w-4 rounded-full border border-line bg-white shadow-sm" aria-hidden="true" />
                <span className="font-semibold text-ink">{activeColors[0].label}</span>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-ink">Color</p>
                <div className="grid gap-2 sm:grid-cols-2">
              {activeColors.map((color) => (
                <label
                  key={color.code}
                  className={
                    selectedColor?.code === color.code
                      ? "flex cursor-pointer items-center gap-3 rounded-md border border-brand bg-panel p-3"
                      : "flex cursor-pointer items-center gap-3 rounded-md border border-line bg-white p-3 hover:border-brand/50"
                  }
                >
                  <input
                    type="radio"
                    name={`${product.slug}-color`}
                    checked={selectedColor?.code === color.code}
                    onChange={() => setSelectedColorCode(color.code)}
                    className="h-4 w-4 accent-brand"
                  />
                  <span className="inline-flex h-5 w-5 rounded-full border border-line bg-white" aria-hidden="true" />
                  <span className="text-sm font-semibold text-ink">{color.label}</span>
                </label>
              ))}
                </div>
              </>
            )}
          </div>
        ) : null}

        {supportsMultiLink ? (
          <div className="grid gap-2">
            <p className="text-sm font-black text-ink">Link Experience</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label
                className={
                  selectedLinkExperience === "direct"
                    ? "grid min-h-[96px] cursor-pointer grid-cols-[auto_1fr] gap-3 rounded-md border border-brand bg-panel p-3 transition"
                    : "grid min-h-[96px] cursor-pointer grid-cols-[auto_1fr] gap-3 rounded-md border border-line bg-white p-3 transition hover:border-brand/50 hover:bg-soft"
                }
              >
                <input
                  type="radio"
                  name={`${product.slug}-link-experience`}
                  checked={selectedLinkExperience === "direct"}
                  onChange={() => {
                    setSelectedLinkExperience("direct");
                    setError("");
                  }}
                  className="mt-1 h-4 w-4 accent-brand"
                />
                <span className="min-w-0">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-base font-black leading-5 text-ink">Direct</span>
                    <span className="shrink-0 text-sm font-black text-ink">Included</span>
                  </span>
                  <span className="mt-1 block text-sm font-semibold leading-5 text-ink">QR + NFC open one link you provide.</span>
                  <span className="mt-1 block text-xs leading-5 text-muted">No monthly fee.</span>
                </span>
              </label>

              <label
                className={
                  selectedLinkExperience === "multilink"
                    ? "grid min-h-[96px] cursor-pointer grid-cols-[auto_1fr] gap-3 rounded-md border border-brand bg-panel p-3 transition"
                    : "grid min-h-[96px] cursor-pointer grid-cols-[auto_1fr] gap-3 rounded-md border border-line bg-white p-3 transition hover:border-brand/50 hover:bg-soft"
                }
              >
                <input
                  type="radio"
                  name={`${product.slug}-link-experience`}
                  checked={selectedLinkExperience === "multilink"}
                  onChange={() => {
                    setSelectedLinkExperience("multilink");
                    setError("");
                  }}
                  className="mt-1 h-4 w-4 accent-brand"
                />
                <span className="min-w-0">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-base font-black leading-5 text-ink">Multi-Link</span>
                    <span className="shrink-0 text-sm font-black text-ink">+{formatPrice(hostedMultiLinkServiceAddon.monthlyPriceCents).replace(".00", "")}/mo</span>
                  </span>
                  <span className="mt-1 block text-sm font-semibold leading-5 text-ink">Editable Tap Rater page with up to 10 links.</span>
                  <span className="mt-1 inline-flex rounded-full bg-white px-2 py-1 text-[11px] font-black uppercase text-brand">Editable anytime</span>
                </span>
              </label>
            </div>
            {selectedLinkExperience === "multilink" ? (
              <p className="rounded-md border border-dashed border-line bg-soft p-3 text-sm leading-6 text-muted">
                Account included. Manage up to 10 links after purchase and change them anytime without replacing your stand.
              </p>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          className="tr-button-primary w-full"
          disabled={configuredUnitPriceCents === null || (selectedLinkExperience === "multilink" && !hostedPurchasingEnabled)}
          onClick={() => selectedOptionId && openBuilder(selectedOptionId)}
        >
          {selectedLinkExperience === "multilink" && !hostedPurchasingEnabled
            ? "Multi-Link Checkout Coming Soon"
            : `Set Up My Stand - ${selectedPrice}${selectedLinkExperience === "multilink" ? ` + ${formatPrice(hostedMultiLinkServiceAddon.monthlyPriceCents).replace(".00", "")}/mo` : ""}`}
        </button>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-muted">
          <span>QR + NFC</span>
          {selectedLinkExperience === "multilink" ? (
            <>
              <span>Hosted Multi-Link</span>
              <span>{formatPrice(hostedMultiLinkServiceAddon.monthlyPriceCents).replace(".00", "")}/mo hosting</span>
            </>
          ) : (
            <>
              <span>No subscription</span>
              <span>Arrives ready to use</span>
            </>
          )}
        </div>

        {error && !isBuilderOpen ? <p className="tr-status-error mt-4" role="alert">{error}</p> : null}
      </section>

      {isBuilderOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 px-3 py-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={modalTitle}>
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden bg-white" style={{ borderRadius: "var(--tr-radius-card)", boxShadow: "var(--tr-shadow-elevated)" }}>
            <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-4 sm:px-6">
              <div>
                <p className="tr-eyebrow">{product.title}</p>
                <h2 className="mt-1 text-2xl font-semibold text-ink">{modalTitle}</h2>
              </div>
              <button type="button" className="tr-icon-button shrink-0" onClick={closeBuilder} aria-label="Close builder">
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-line px-4 py-3 sm:px-6">
              <ol className={`grid gap-2 text-xs font-semibold uppercase text-muted ${stepGridClassName}`}>
                {stepLabels.map((label, index) => (
                  <li key={label} className={index < activeStepIndex ? "rounded-lg bg-panel text-brand" : index === activeStepIndex ? "rounded-lg bg-ink text-white" : "rounded-lg border border-line"}>
                    <button
                      type="button"
                      className="flex w-full items-center px-3 py-2 text-left disabled:cursor-default"
                      disabled={index >= activeStepIndex}
                      onClick={() => {
                        if (index === 0) setStep("destination");
                        if (index === 1 && selectedOption.id === "branded_qr_direct") setStep("design");
                      }}
                    >
                      <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-[11px] text-ink">{index + 1}</span>
                      <span>{label}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>

            <div className="overflow-y-auto px-4 py-3 sm:px-6">
              {step !== "destination" ? (
                <button type="button" className="mb-3 text-sm font-semibold text-brand hover:text-ink" onClick={goToPreviousStep}>
                  Back to previous step
                </button>
              ) : null}

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
                    <div className="tr-panel-muted grid gap-3">
                      <label className="grid gap-2 text-sm font-semibold text-ink">
                        Google Business search
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                          <input
                            className="tr-input min-w-0 pl-10 pr-24"
                            value={googleSearchQuery}
                            onChange={(event) => {
                              setGoogleSearchQuery(event.target.value);
                              setSelectedGoogleSearchQuery("");
                              if (googlePlaceId) {
                                setGooglePlaceId("");
                                setGooglePlaceName("");
                                setDestinationUrl("");
                                setProofApproved(false);
                                setApprovedProofSnapshot(null);
                              }
                            }}
                            placeholder="Business name and city"
                          />
                          {isSearchingGoogle ? <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">Searching</span> : null}
                        </div>
                      </label>

                      {googleSearchMessage ? <p className="text-sm font-semibold text-muted" role="status">{googleSearchMessage}</p> : null}
                      {googleResults.length ? (
                        <div className="grid gap-2">
                          {googleResults.map((place) => (
                            <button
                              key={place.placeId}
                              type="button"
                              className="rounded-lg border border-line bg-white p-3 text-left transition hover:border-brand"
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
                      className="tr-input"
                      type="url"
                      value={destinationUrl}
                      onChange={(event) => {
                        setDestinationUrl(event.target.value);
                        setGooglePlaceId("");
                        setGooglePlaceName("");
                        setProofApproved(false);
                        setApprovedProofSnapshot(null);
                      }}
                      placeholder={isGoogleReviewProduct ? "https://search.google.com/local/writereview?placeid=..." : "https://example.com"}
                    />
                  </label>

                  {googlePlaceName ? (
                    <p className="tr-status-success">
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
                      Upload the logo and enter the exact business name for the front proof.
                    </p>
                  </div>

                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    Business name
                    <input
                      className="tr-input"
                      value={businessName}
                      onChange={(event) => {
                        setBusinessName(event.target.value);
                        setProofApproved(false);
                        setApprovedProofSnapshot(null);
                      }}
                      placeholder="Your business name"
                    />
                  </label>

                  <div className="tr-panel-muted grid gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">Business logo</p>
                        <p className="mt-1 text-xs leading-5 text-muted">PNG, JPG, or WEBP up to 10 MB. SVG is not accepted here.</p>
                      </div>
                      {logo ? <span className="tr-pill-brand">Logo uploaded</span> : null}
                    </div>
                    <label className="grid min-h-32 cursor-pointer place-items-center rounded-lg border border-dashed border-line bg-white p-4 text-center text-sm font-medium text-muted transition hover:border-brand">
                      <UploadCloud className="mb-2 h-6 w-6" />
                      {isUploadingLogo ? "Uploading logo..." : logo ? logo.filename : "Upload logo"}
                      <span className="mt-1 block text-xs font-semibold text-brand">{logo ? "Click to replace" : "Choose file"}</span>
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
                <div className="grid gap-3">
                  <div className="sr-only">
                    <p className="text-sm font-semibold text-ink">{selectedOption.id === "branded_qr_direct" ? "Proof preview" : "Confirm setup"}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {selectedOption.id === "branded_qr_direct"
                        ? "This is the front proof. Confirm the logo, business name, and QR placement before adding to cart."
                        : "Confirm the direct destination link before adding this stand to cart. The NFC tap opens this URL."}
                    </p>
                  </div>

                  <div className="tr-panel-muted grid gap-x-4 gap-y-1 text-sm text-muted sm:grid-cols-2">
                    <ReviewLine label="Product" value={product.title} />
                    <ReviewLine label="Setup" value={selectedOption.label} />
                    <ReviewLine label="Size" value={selectedSize?.label ?? "-"} />
                    <ReviewLine label="Color" value={selectedColor?.label ?? "-"} />
                    <ReviewLine label="SKU" value={finalSku} />
                    <ReviewLine label="Price" value={configuredUnitPriceCents === null ? "Price pending" : formatPrice(configuredUnitPriceCents)} />
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
                        logo={logo}
                        product={product}
                        qrValue={generatedQrValue}
                        templateUrl={brandedFrontTemplateUrl}
                      />
                      <label className="flex items-start gap-3 rounded-lg border border-line bg-white p-3 text-sm font-semibold text-ink">
                        <input
                          className="mt-1"
                          type="checkbox"
                          checked={proofApproved}
                          onChange={(event) => {
                            setProofApproved(event.target.checked);
                            setApprovedProofSnapshot(event.target.checked && currentApprovalSnapshot ? currentApprovalSnapshot : null);
                          }}
                        />
                        I reviewed the front proof preview and confirm these branded setup details.
                      </label>
                    </>
                  ) : (
                    <div className="rounded-lg border border-line bg-white p-3 text-sm leading-6 text-muted">
                      <p className="font-semibold text-ink">Standard Direct confirmation</p>
                      <p>The NFC tap opens the destination link above. No Tap Rater account, hosted page, or activation is required.</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="border-t border-line bg-white px-4 py-4 sm:px-6">
              {error ? <p className="tr-status-error mb-3" role="alert">{error}</p> : null}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  className="tr-button-outline"
                  onClick={() => {
                    if (step === "destination") closeBuilder();
                    else goToPreviousStep();
                  }}
                >
                  {step === "destination" ? "Cancel" : "Back"}
                </button>
                {step === "destination" ? (
                  <button type="button" className="tr-button-primary" onClick={continueFromDestination}>
                    {selectedOption.id === "branded_qr_direct" ? "Continue to logo" : "Review setup"}
                  </button>
                ) : null}
                {step === "design" && selectedOption.id === "branded_qr_direct" ? (
                  <button type="button" className="tr-button-primary" onClick={continueFromDesign}>
                    Preview proof
                  </button>
                ) : null}
                {step === "review" ? (
                  <button type="button" className="tr-button-primary" onClick={addConfiguredItemToCart}>
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
    <div className="tr-panel-muted grid gap-3 p-3 sm:grid-cols-[96px_1fr] sm:items-center">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-white">
        <Image src={image.src} alt={image.alt} fill unoptimized className="object-contain p-2" />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">{productTitle}</p>
        <p className="mt-1 text-sm text-muted">{option.label} · {formatPrice(option.priceCents)}</p>
        <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.05em] text-brand">
          <CheckCircle2 size={14} />
          QR and NFC direct
        </p>
      </div>
    </div>
  );
}

function ProofPreview({
  businessName,
  logo,
  product,
  qrValue,
  templateUrl
}: {
  businessName: string;
  logo: UploadedLogo | null;
  product: ProductSetupChooserProduct;
  qrValue: string;
  templateUrl: string;
}) {
  return (
    <div className="tr-card p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">Front proof preview</p>
        <p className="tr-caption font-semibold">QR generated from destination link</p>
      </div>
      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
        {templateUrl ? (
          <TemplateProofPreview businessName={businessName} logo={logo} qrValue={qrValue} templateUrl={templateUrl} />
        ) : (
          <CleanProofPreview businessName={businessName} logo={logo} product={product} qrValue={qrValue} />
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
    <div className="relative mx-auto aspect-[1278/1949] w-full max-w-[320px] overflow-hidden rounded-lg border border-line bg-white">
      <img src={templateUrl} alt="Branded front template proof" className="absolute inset-0 h-full w-full object-contain" />
      <div className="absolute grid place-items-center p-[3%]" style={regionStyle(brandedStandComposition.logoRegion)}>
        {logo ? (
          <img src={logo.mediaUrl} alt="Uploaded business logo" className="max-h-[72%] max-w-[78%] object-contain" />
        ) : (
          <span className="rounded-lg border border-dashed border-line bg-white/90 px-3 py-1 text-[9px] font-black uppercase text-muted">Logo zone</span>
        )}
      </div>
      <p className="absolute overflow-hidden text-center text-[clamp(13px,3.2vw,17px)] font-black leading-tight text-ink" style={regionStyle(brandedStandComposition.businessNameRegion)}>
        {businessName || "Business name"}
      </p>
      <div className="absolute" style={regionStyle(brandedStandComposition.qrRegion)}>
        <QrPreview value={qrValue} variant="template" />
      </div>
    </div>
  );
}

function CleanProofPreview({
  businessName,
  logo,
  product,
  qrValue
}: {
  businessName: string;
  logo: UploadedLogo | null;
  product: ProductSetupChooserProduct;
  qrValue: string;
}) {
  return (
    <div className="mx-auto grid aspect-[0.68] w-full max-w-[390px] justify-items-center rounded-lg border border-line bg-white p-5 text-center">
      <div className="grid min-h-16 w-full place-items-center rounded-lg border border-dashed border-line bg-soft p-2">
        {logo ? <img src={logo.mediaUrl} alt="Uploaded business logo" className="max-h-14 max-w-[80%] object-contain" /> : <span className="text-xs font-black uppercase text-muted">Logo zone</span>}
      </div>
      <p className="mt-3 max-w-full break-words text-sm font-black uppercase text-ink">{businessName || "Business name"}</p>
      <div className="mt-5 grid justify-items-center gap-2">
        <p className="text-5xl font-black text-brand">{platformMark(product)}</p>
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
    <p className="[overflow-wrap:anywhere]">
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

function isGoogleReviewStand(product: ProductSetupChooserProduct) {
  const searchableText = `${product.slug} ${product.title} ${product.categorySlug} ${product.destinationType ?? ""} ${product.primaryPlatformSlug ?? ""}`.toLowerCase();
  return searchableText.includes("google") && searchableText.includes("review");
}

function regionStyle(region: BrandedCompositionRegion) {
  return {
    left: `${region.xPercent}%`,
    top: `${region.yPercent}%`,
    width: `${region.widthPercent}%`,
    height: `${region.heightPercent}%`
  };
}

function getOptionSummary(option: PurchaseOption) {
  if (option.id === "hosted_multilink") {
    return "Hosted page with up to 10 links";
  }

  if (option.id === "branded_qr_direct") {
    return "Front proof included";
  }

  return "Direct to your destination link";
}

function getOptionShortSummary(option: PurchaseOption) {
  if (option.id === "hosted_multilink") {
    return "Review, menu, booking, social, and website links";
  }

  if (option.id === "branded_qr_direct") {
    return "Your logo + business name + QR";
  }

  return "Ready-made stand design";
}

function getOptionDisplayLabel(option: PurchaseOption) {
  if (option.id === "hosted_multilink") {
    return "Multi-Link";
  }

  if (option.id === "branded_qr_direct") {
    return "Branded + QR";
  }

  return option.label;
}

function formatSizeLabel(label: string) {
  if (label.toLowerCase().includes("a4")) {
    return "Large - A4";
  }

  return label;
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
