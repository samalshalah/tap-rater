"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckCircle2, Search, UploadCloud, X } from "lucide-react";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import type { MigratedProduct } from "@/data/migrated-products";
import { brandedStandComposition, type BrandedCompositionRegion } from "@/lib/branded-composition";
import { formatPrice } from "@/lib/products";
import { getProductPurchaseOptions, isHostedPurchaseOptionEnabled, type PurchaseOption, type PurchaseOptionId } from "@/lib/purchase-options";
import { generateProductVariantSku, getConfiguredUnitPriceCents, getDefaultProductColor, getDefaultProductSize, getProductBaseSku } from "@/lib/product-model";
import { createQrSvg, QR_CODE_ERROR_MESSAGE } from "@/lib/qr-code";
import { buildDirectProductionTargets, buildProofApprovalSnapshot, isProofApprovalSnapshotCurrent, type ProofApprovalSnapshot } from "@/lib/direct-production";
import { generateGoogleReviewUrl } from "@/lib/google-review";
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

type SetupStep = "choose" | "destination" | "design" | "review" | "confirmation";
type LinkExperienceId = "direct" | "multilink";

type ProductSetupChooserProps = {
  product: ProductSetupChooserProduct;
  googleMapsApiKey?: string;
  selectedOptionId?: PurchaseOptionId;
  onSelectedOptionChange?: (optionId: PurchaseOptionId) => void;
  onSelectedPriceChange?: (priceCents: number | null) => void;
};

type UploadedLogo = {
  mediaUrl: string;
  storageKey: string;
  filename: string;
  originalMediaUrl?: string;
  originalStorageKey?: string;
  originalFilename?: string;
  trimApplied?: boolean;
  blankMarginPercent?: number;
};

type LogoBackgroundMode = "auto_crop" | "original";
type LogoFitMode = "contain" | "fill";

type GooglePlaceResult = {
  placeId: string;
  name: string;
  formattedAddress: string;
  reviewUrl: string;
};

let productGoogleMapsScriptPromise: Promise<void> | null = null;

export function ProductSetupChooser({ product, googleMapsApiKey, selectedOptionId: controlledSelectedOptionId, onSelectedOptionChange, onSelectedPriceChange }: ProductSetupChooserProps) {
  const options = useMemo(() => getProductPurchaseOptions(product), [product]);
  const [uncontrolledSelectedOptionId, setUncontrolledSelectedOptionId] = useState<PurchaseOptionId>(options[0]?.id ?? "standard_direct");
  const [selectedLinkExperience, setSelectedLinkExperience] = useState<LinkExperienceId>("direct");
  const [step, setStep] = useState<SetupStep>("choose");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [googleSearchQuery, setGoogleSearchQuery] = useState("");
  const [googleAutocompleteStatus, setGoogleAutocompleteStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");
  const [googlePlaceId, setGooglePlaceId] = useState("");
  const [googlePlaceName, setGooglePlaceName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [logo, setLogo] = useState<UploadedLogo | null>(null);
  const [selectedSizeCode, setSelectedSizeCode] = useState(() => getDefaultProductSize(product)?.code ?? "");
  const [selectedColorCode, setSelectedColorCode] = useState(() => getDefaultProductColor(product)?.code ?? "");
  const [proofFontSizePercent, setProofFontSizePercent] = useState(100);
  const [proofLogoSizePercent, setProofLogoSizePercent] = useState(100);
  const [designAssistanceRequested, setDesignAssistanceRequested] = useState(false);
  const [designNotes, setDesignNotes] = useState("");
  const [manualDesignAcknowledged, setManualDesignAcknowledged] = useState(false);
  const [logoBackgroundMode, setLogoBackgroundMode] = useState<LogoBackgroundMode>("auto_crop");
  const [logoFitMode, setLogoFitMode] = useState<LogoFitMode>("contain");
  const [logoOffsetXPercent, setLogoOffsetXPercent] = useState(0);
  const [logoOffsetYPercent, setLogoOffsetYPercent] = useState(0);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [proofApproved, setProofApproved] = useState(false);
  const [approvedProofSnapshot, setApprovedProofSnapshot] = useState<ProofApprovalSnapshot | null>(null);
  const [error, setError] = useState("");
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const googleSearchInputRef = useRef<HTMLInputElement | null>(null);
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
  const proofFrontTemplateUrl = product.assetSet?.standardFrontTemplateUrl ?? product.assetSet?.brandedFrontTemplateUrl ?? "";
  const selectedLogoMediaUrl = logoBackgroundMode === "original" ? logo?.originalMediaUrl ?? logo?.mediaUrl : logo?.mediaUrl;
  const selectedLogoStorageKey = logoBackgroundMode === "original" ? logo?.originalStorageKey ?? logo?.storageKey : logo?.storageKey;
  const setupOptions = options;
  const generatedQrValue = destinationUrl.trim();
  const directTargets = buildDirectProductionTargets(destinationUrl);
  const currentApprovalSnapshot = selectedOption
    ? buildProofApprovalSnapshot({
        productSlug: product.slug,
        optionCode: selectedOption.id,
        destinationUrl,
        businessName,
        logoStorageKey: selectedLogoStorageKey,
        logoMediaUrl: selectedLogoMediaUrl,
        generatedQrValue,
        frontTemplateUrl: proofFrontTemplateUrl || undefined,
        fontSizePercent: proofFontSizePercent,
        logoSizePercent: proofLogoSizePercent,
        logoBackgroundMode,
        logoFitMode,
        logoOffsetXPercent,
        logoOffsetYPercent
      })
    : undefined;
  const isApprovedConfigurationCurrent =
    selectedOption?.id !== "branded_qr_direct" ||
    designAssistanceRequested ||
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

    if (!googleMapsApiKey || !googleSearchInputRef.current) {
      setGoogleAutocompleteStatus("fallback");
      return;
    }

    let mounted = true;
    setGoogleAutocompleteStatus("loading");

    loadProductGooglePlaces(googleMapsApiKey)
      .then(() => {
        if (!mounted || !googleSearchInputRef.current || !window.google?.maps?.places?.Autocomplete) {
          return;
        }

        const autocomplete = new window.google.maps.places.Autocomplete(googleSearchInputRef.current, {
          fields: ["place_id", "name", "formatted_address"],
          types: ["establishment"],
          componentRestrictions: { country: "us" }
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place.place_id || !place.name) {
            return;
          }

          useGooglePlace({
            placeId: place.place_id,
            name: place.name,
            formattedAddress: place.formatted_address ?? "",
            reviewUrl: generateGoogleReviewUrl(place.place_id)
          });
        });

        setGoogleAutocompleteStatus("ready");
      })
      .catch(() => {
        if (mounted) {
          setGoogleAutocompleteStatus("fallback");
        }
      });

    return () => {
      mounted = false;
    };
  }, [googleMapsApiKey, isGoogleReviewProduct, step]);

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
    setDesignAssistanceRequested(false);
    setManualDesignAcknowledged(false);
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

  function useGooglePlace(place: GooglePlaceResult) {
    const selectedQuery = `${place.name}${place.formattedAddress ? ` - ${place.formattedAddress}` : ""}`;
    setGooglePlaceId(place.placeId);
    setGooglePlaceName(place.name);
    setGoogleSearchQuery(selectedQuery);
    setDestinationUrl(place.reviewUrl);
    setBusinessName((current) => current || place.name);
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

    setIsUploadingLogo(true);

    try {
      const preparedLogo = await prepareLogoUpload(file);
      const originalAsset = await uploadLogoAsset(file, product.slug);
      const processedAsset = preparedLogo.file === file ? originalAsset : await uploadLogoAsset(preparedLogo.file, product.slug);

      setLogoBackgroundMode(preparedLogo.trimApplied ? "auto_crop" : "original");
      setLogoFitMode("contain");
      setProofLogoSizePercent(preparedLogo.trimApplied ? 125 : 115);
      setLogoOffsetXPercent(0);
      setLogoOffsetYPercent(0);
      setLogo({
        mediaUrl: processedAsset.mediaUrl,
        storageKey: processedAsset.storageKey,
        filename: processedAsset.filename,
        originalMediaUrl: originalAsset.mediaUrl,
        originalStorageKey: originalAsset.storageKey,
        originalFilename: originalAsset.filename,
        trimApplied: preparedLogo.trimApplied,
        blankMarginPercent: preparedLogo.blankMarginPercent
      });
      setDesignAssistanceRequested(false);
      setManualDesignAcknowledged(false);
      setProofApproved(false);
      setApprovedProofSnapshot(null);
    } catch (error) {
      setLogo(null);
      setProofApproved(false);
      setApprovedProofSnapshot(null);
      setError(error instanceof Error ? error.message : "Logo upload failed. Please try again.");
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

    setProofApproved(false);
    setApprovedProofSnapshot(null);
    setStep("review");
  }

  function continueFromProof() {
    setError("");

    if (selectedOption.id === "branded_qr_direct" && !logo && !designAssistanceRequested) {
      setError("Upload your business logo or choose Tap Rater design help before continuing.");
      return;
    }

    setProofApproved(false);
    setApprovedProofSnapshot(null);
    setStep("confirmation");
  }

  function goToPreviousStep() {
    setError("");
    if (step === "confirmation") {
      setStep("review");
      return;
    }

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

      if (!logo && !designAssistanceRequested) {
        setError("Upload your business logo before adding this stand to cart.");
        setStep("design");
        return;
      }

      if (!designAssistanceRequested && !proofFrontTemplateUrl) {
        setError("Branded artwork is not configured for this product yet.");
        setStep("design");
        return;
      }

      if (designAssistanceRequested && !manualDesignAcknowledged) {
        setError("Confirm that Tap Rater will send the final design proof before production.");
        setStep("confirmation");
        return;
      }

      if (!designAssistanceRequested && (!isApprovedConfigurationCurrent || !currentApprovalSnapshot)) {
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
        logoFileName: logoBackgroundMode === "original" ? logo?.originalFilename ?? logo?.filename : logo?.filename,
        logoMediaUrl: selectedLogoMediaUrl,
        logoStorageKey: selectedLogoStorageKey,
        originalLogoMediaUrl: logo?.originalMediaUrl,
        originalLogoStorageKey: logo?.originalStorageKey,
        designAssistanceRequested: selectedOption.id === "branded_qr_direct" ? designAssistanceRequested : undefined,
        logoBackgroundMode: selectedOption.id === "branded_qr_direct" ? logoBackgroundMode : undefined,
        logoFitMode: selectedOption.id === "branded_qr_direct" ? logoFitMode : undefined,
        logoOffsetXPercent: selectedOption.id === "branded_qr_direct" ? logoOffsetXPercent : undefined,
        logoOffsetYPercent: selectedOption.id === "branded_qr_direct" ? logoOffsetYPercent : undefined,
        generatedQrValue: directTargets?.qrTargetUrl,
        qrTargetUrl: directTargets?.qrTargetUrl,
        nfcTargetUrl: directTargets?.nfcTargetUrl,
        frontTemplateUrl: selectedOption.hasQr ? proofFrontTemplateUrl || undefined : product.assetSet?.standardFrontTemplateUrl || undefined,
        fontSizePercent: selectedOption.id === "branded_qr_direct" ? proofFontSizePercent : undefined,
        logoSizePercent: selectedOption.id === "branded_qr_direct" ? proofLogoSizePercent : undefined,
        designNotes: selectedOption.id === "branded_qr_direct" ? designNotes.trim() || undefined : undefined,
        proofApprovalSnapshot: selectedOption.id === "branded_qr_direct" && !designAssistanceRequested ? approvedProofSnapshot ?? currentApprovalSnapshot : undefined,
        proofApprovedAt: selectedOption.id === "branded_qr_direct" && !designAssistanceRequested ? new Date().toISOString() : undefined,
        proofPreviewData:
          selectedOption.id === "branded_qr_direct" && !designAssistanceRequested
            ? {
                productTitle: product.title,
                businessName: businessName.trim(),
                logoMediaUrl: selectedLogoMediaUrl,
                qrValue: directTargets?.qrTargetUrl,
                frontTemplateUrl: proofFrontTemplateUrl || undefined,
                fontSizePercent: proofFontSizePercent,
                logoSizePercent: proofLogoSizePercent,
                logoBackgroundMode,
                logoFitMode,
                logoOffsetXPercent,
                logoOffsetYPercent
              }
            : undefined,
        hasQr: true,
        nfcOnly: false,
        priceCents: configuredUnitPriceCents,
        proofApproved: selectedOption.id === "branded_qr_direct" ? !designAssistanceRequested && proofApproved : true,
        manualCollectionAcknowledged: selectedOption.id === "branded_qr_direct" ? designAssistanceRequested && manualDesignAcknowledged : undefined
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
  const stepLabels = selectedOption.id === "branded_qr_direct" ? ["Destination", "Logo + name", "Proof", "Confirm"] : ["Destination", "Confirm"];
  const stepGridClassName = selectedOption.id === "branded_qr_direct" ? "sm:grid-cols-4" : "sm:grid-cols-2";
  const activeStepIndex = selectedOption.id === "branded_qr_direct"
    ? step === "destination"
      ? 0
      : step === "design"
        ? 1
        : step === "review"
          ? 2
          : 3
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
                        if (index === 2 && selectedOption.id === "branded_qr_direct") setStep("review");
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
                            ref={googleSearchInputRef}
                            className="tr-input min-w-0 pl-10 pr-24"
                            value={googleSearchQuery}
                            onChange={(event) => {
                              setGoogleSearchQuery(event.target.value);
                              if (googlePlaceId) {
                                setGooglePlaceId("");
                                setGooglePlaceName("");
                                setDestinationUrl("");
                                setProofApproved(false);
                                setApprovedProofSnapshot(null);
                              }
                            }}
                            placeholder="Business name and city"
                            autoComplete="off"
                          />
                          {googleAutocompleteStatus === "loading" ? (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">Loading</span>
                          ) : null}
                        </div>
                      </label>

                      {googleAutocompleteStatus === "fallback" ? (
                        <p className="text-sm font-semibold text-muted" role="status">Google business search is unavailable. Paste your Google review link manually.</p>
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

                  {selectedOption.id === "branded_qr_direct" ? (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-white px-3 py-2 text-sm text-muted">
                      <span className="font-semibold text-ink">{product.title}</span>
                      <span>{selectedOption.label}</span>
                      <span>{configuredUnitPriceCents === null ? "Price pending" : formatPrice(configuredUnitPriceCents)}</span>
                      {googlePlaceName ? <span>{googlePlaceName}</span> : null}
                    </div>
                  ) : (
                    <div className="tr-panel-muted grid gap-x-4 gap-y-1 text-sm text-muted sm:grid-cols-2">
                      <ReviewLine label="Product" value={product.title} />
                      <ReviewLine label="Setup" value={selectedOption.label} />
                      <ReviewLine label="Size" value={selectedSize?.label ?? "-"} />
                      <ReviewLine label="Color" value={selectedColor?.label ?? "-"} />
                      <ReviewLine label="SKU" value={finalSku} />
                      <ReviewLine label="Price" value={configuredUnitPriceCents === null ? "Price pending" : formatPrice(configuredUnitPriceCents)} />
                      <ReviewLine label="Destination link" value={destinationUrl || "-"} />
                      {googlePlaceName ? <ReviewLine label="Google business" value={googlePlaceName} /> : null}
                    </div>
                  )}

                  {selectedOption.id === "branded_qr_direct" ? (
                    <div className="mx-auto grid w-full max-w-3xl gap-3 rounded-lg border border-line bg-white p-3">
                      <label className="flex items-start gap-3 text-sm font-semibold text-ink">
                        <input
                          className="mt-1"
                          type="checkbox"
                          checked={designAssistanceRequested}
                          onChange={(event) => {
                            setDesignAssistanceRequested(event.target.checked);
                            setManualDesignAcknowledged(false);
                            setProofApproved(false);
                            setApprovedProofSnapshot(null);
                          }}
                        />
                        <span>
                          I want Tap Rater to prepare or fix my logo proof.
                          <span className="mt-1 block text-xs font-medium leading-5 text-muted">
                            You can continue checkout now. We will send the branded proof for approval before production.
                          </span>
                        </span>
                      </label>

                      {designAssistanceRequested ? (
                        <label className="grid gap-2 text-sm font-semibold text-ink">
                          Design notes
                          <textarea
                            className="tr-input min-h-24 resize-y"
                            value={designNotes}
                            onChange={(event) => setDesignNotes(event.target.value)}
                            placeholder="Example: use the logo from my website, remove the white background, or I will send the logo later."
                          />
                        </label>
                      ) : null}
                    </div>
                  ) : null}

                  {selectedOption.id === "branded_qr_direct" && logo && !designAssistanceRequested ? (
                    <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(300px,420px)_minmax(320px,1fr)] lg:items-start">
                      <ProofPreview
                        businessName={businessName}
                        logoMediaUrl={selectedLogoMediaUrl}
                        logoFitMode={logoFitMode}
                        logoOffsetXPercent={logoOffsetXPercent}
                        logoOffsetYPercent={logoOffsetYPercent}
                        product={product}
                        qrValue={generatedQrValue}
                        templateUrl={proofFrontTemplateUrl}
                        fontSizePercent={proofFontSizePercent}
                        logoSizePercent={proofLogoSizePercent}
                      />
                      <ProofControls
                        logo={logo}
                        logoBackgroundMode={logoBackgroundMode}
                        logoFitMode={logoFitMode}
                        logoOffsetXPercent={logoOffsetXPercent}
                        logoOffsetYPercent={logoOffsetYPercent}
                        proofFontSizePercent={proofFontSizePercent}
                        proofLogoSizePercent={proofLogoSizePercent}
                        onLogoBackgroundModeChange={(value) => {
                          setLogoBackgroundMode(value);
                          setProofApproved(false);
                          setApprovedProofSnapshot(null);
                        }}
                        onLogoFitModeChange={(value) => {
                          setLogoFitMode(value);
                          setProofApproved(false);
                          setApprovedProofSnapshot(null);
                        }}
                        onLogoOffsetXPercentChange={(value) => {
                          setLogoOffsetXPercent(value);
                          setProofApproved(false);
                          setApprovedProofSnapshot(null);
                        }}
                        onLogoOffsetYPercentChange={(value) => {
                          setLogoOffsetYPercent(value);
                          setProofApproved(false);
                          setApprovedProofSnapshot(null);
                        }}
                        onProofFontSizePercentChange={(value) => {
                          setProofFontSizePercent(value);
                          setProofApproved(false);
                          setApprovedProofSnapshot(null);
                        }}
                        onProofLogoSizePercentChange={(value) => {
                          setProofLogoSizePercent(value);
                          setProofApproved(false);
                          setApprovedProofSnapshot(null);
                        }}
                      />
                    </div>
                  ) : selectedOption.id === "branded_qr_direct" && designAssistanceRequested ? (
                    <div className="mx-auto grid w-full max-w-2xl gap-3 rounded-lg border border-line bg-white p-4 text-center">
                      <p className="text-sm font-semibold text-ink">Tap Rater will prepare your branded proof</p>
                      <p className="mx-auto max-w-xl text-sm leading-6 text-muted">
                        Your order can continue without an uploaded logo. We will contact you, prepare the front design, and send it for approval before production.
                      </p>
                      <ProofPreview
                        businessName={businessName}
                        logoMediaUrl={undefined}
                        logoFitMode={logoFitMode}
                        logoOffsetXPercent={logoOffsetXPercent}
                        logoOffsetYPercent={logoOffsetYPercent}
                        product={product}
                        qrValue={generatedQrValue}
                        templateUrl={proofFrontTemplateUrl}
                        fontSizePercent={proofFontSizePercent}
                        logoSizePercent={proofLogoSizePercent}
                        designAssistanceRequested
                      />
                    </div>
                  ) : selectedOption.id === "branded_qr_direct" ? (
                    <div className="mx-auto grid w-full max-w-2xl gap-2 rounded-lg border border-line bg-white p-4 text-center">
                      <p className="text-sm font-semibold text-ink">No logo uploaded yet</p>
                      <p className="mx-auto max-w-xl text-sm leading-6 text-muted">
                        Upload a logo from the previous step, or choose Tap Rater design help above to continue without one.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-line bg-white p-3 text-sm leading-6 text-muted">
                      <p className="font-semibold text-ink">Standard Direct confirmation</p>
                      <p>The NFC tap opens the destination link above. No Tap Rater account, hosted page, or activation is required.</p>
                    </div>
                  )}
                </div>
              ) : null}

              {step === "confirmation" && selectedOption.id === "branded_qr_direct" ? (
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg border border-line bg-white px-3 py-2 text-sm text-muted">
                    <span className="font-semibold text-ink">{product.title}</span>
                    <span>{selectedOption.label}</span>
                    <span>{configuredUnitPriceCents === null ? "Price pending" : formatPrice(configuredUnitPriceCents)}</span>
                    {googlePlaceName ? <span>{googlePlaceName}</span> : null}
                  </div>
                  <ProofPreview
                    businessName={businessName}
                    logoMediaUrl={selectedLogoMediaUrl}
                    logoFitMode={logoFitMode}
                    logoOffsetXPercent={logoOffsetXPercent}
                    logoOffsetYPercent={logoOffsetYPercent}
                    product={product}
                    qrValue={generatedQrValue}
                    templateUrl={proofFrontTemplateUrl}
                    fontSizePercent={proofFontSizePercent}
                    logoSizePercent={proofLogoSizePercent}
                    designAssistanceRequested={designAssistanceRequested}
                  />
                  {designAssistanceRequested ? (
                    <label className="mx-auto flex w-full max-w-2xl items-start gap-3 rounded-lg border border-line bg-white p-3 text-sm font-semibold text-ink">
                      <input
                        className="mt-1"
                        type="checkbox"
                        checked={manualDesignAcknowledged}
                        onChange={(event) => setManualDesignAcknowledged(event.target.checked)}
                      />
                      I understand Tap Rater will send me the branded design proof for approval before production.
                    </label>
                  ) : (
                    <label className="mx-auto flex w-full max-w-2xl items-start gap-3 rounded-lg border border-line bg-white p-3 text-sm font-semibold text-ink">
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
                {step === "review" && selectedOption.id === "branded_qr_direct" ? (
                  <button type="button" className="tr-button-primary" onClick={continueFromProof}>
                    Continue to confirmation
                  </button>
                ) : null}
                {step === "review" && selectedOption.id !== "branded_qr_direct" ? (
                  <button type="button" className="tr-button-primary" onClick={addConfiguredItemToCart}>
                    Add to cart
                  </button>
                ) : null}
                {step === "confirmation" ? (
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

function ProofRangeControl({
  label,
  max,
  min,
  onChange,
  unit = "%",
  value
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  unit?: string;
  value: number;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <span className="text-xs font-bold text-muted">{value}{unit}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-brand"
      />
    </label>
  );
}

function ProofControls({
  logo,
  logoBackgroundMode,
  logoFitMode,
  logoOffsetXPercent,
  logoOffsetYPercent,
  onLogoBackgroundModeChange,
  onLogoFitModeChange,
  onLogoOffsetXPercentChange,
  onLogoOffsetYPercentChange,
  onProofFontSizePercentChange,
  onProofLogoSizePercentChange,
  proofFontSizePercent,
  proofLogoSizePercent
}: {
  logo: UploadedLogo;
  logoBackgroundMode: LogoBackgroundMode;
  logoFitMode: LogoFitMode;
  logoOffsetXPercent: number;
  logoOffsetYPercent: number;
  onLogoBackgroundModeChange: (value: LogoBackgroundMode) => void;
  onLogoFitModeChange: (value: LogoFitMode) => void;
  onLogoOffsetXPercentChange: (value: number) => void;
  onLogoOffsetYPercentChange: (value: number) => void;
  onProofFontSizePercentChange: (value: number) => void;
  onProofLogoSizePercentChange: (value: number) => void;
  proofFontSizePercent: number;
  proofLogoSizePercent: number;
}) {
  return (
    <div className="grid gap-4 rounded-lg border border-line bg-white p-3 lg:sticky lg:top-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <ProofSegmentedControl
          label="Logo background"
          value={logoBackgroundMode}
          options={[
            { label: "Auto-crop", value: "auto_crop" },
            { label: "Original", value: "original" }
          ]}
          disabled={!logo.trimApplied}
          onChange={(value) => onLogoBackgroundModeChange(value as LogoBackgroundMode)}
        />
        <ProofSegmentedControl
          label="Logo fit"
          value={logoFitMode}
          options={[
            { label: "Fit", value: "contain" },
            { label: "Fill", value: "fill" }
          ]}
          onChange={(value) => onLogoFitModeChange(value as LogoFitMode)}
        />
      </div>
      {logo.trimApplied ? (
        <p className="text-xs font-semibold text-brand">Auto-crop removed about {logo.blankMarginPercent ?? 0}% blank logo margin. Original is still available.</p>
      ) : null}
      <div className="grid gap-4">
        <ProofRangeControl
          label="Font size"
          value={proofFontSizePercent}
          min={75}
          max={135}
          onChange={onProofFontSizePercentChange}
        />
        <ProofRangeControl
          label="Logo size"
          value={proofLogoSizePercent}
          min={75}
          max={160}
          onChange={onProofLogoSizePercentChange}
        />
        <ProofRangeControl
          label="Logo left / right"
          value={logoOffsetXPercent}
          min={-40}
          max={40}
          unit=""
          onChange={onLogoOffsetXPercentChange}
        />
        <ProofRangeControl
          label="Logo up / down"
          value={logoOffsetYPercent}
          min={-40}
          max={40}
          unit=""
          onChange={onLogoOffsetYPercentChange}
        />
      </div>
    </div>
  );
}

function ProofSegmentedControl({
  disabled = false,
  label,
  onChange,
  options,
  value
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <div className={disabled ? "grid gap-2 text-sm font-semibold text-muted opacity-60" : "grid gap-2 text-sm font-semibold text-ink"}>
      <p>{label}</p>
      <div className="grid grid-cols-2 rounded-lg border border-line bg-soft p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={
              value === option.value
                ? "rounded-md bg-white px-3 py-2 text-xs font-black text-ink shadow-sm"
                : "rounded-md px-3 py-2 text-xs font-black text-muted hover:text-ink disabled:hover:text-muted"
            }
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

async function uploadLogoAsset(file: File, productSlug: string): Promise<UploadedLogo> {
  const form = new FormData();
  form.set("file", file);
  form.set("productSlug", productSlug);

  const response = await fetch("/api/setup/logo-upload", {
    method: "POST",
    body: form
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok || !body.asset?.mediaUrl || !body.asset?.storageKey) {
    throw new Error(body.error ?? "Logo upload failed. Use a PNG, JPG, or WEBP image up to 10 MB.");
  }

  return {
    mediaUrl: body.asset.mediaUrl,
    storageKey: body.asset.storageKey,
    filename: body.asset.filename ?? file.name
  };
}

async function prepareLogoUpload(file: File): Promise<{ file: File; trimApplied: boolean; blankMarginPercent: number }> {
  const image = await loadLogoImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context || canvas.width < 2 || canvas.height < 2) {
    return { file, trimApplied: false, blankMarginPercent: 0 };
  }

  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const index = (y * canvas.width + x) * 4;
      if (isLogoContentPixel(data[index], data[index + 1], data[index + 2], data[index + 3])) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return { file, trimApplied: false, blankMarginPercent: 0 };
  }

  const contentWidth = maxX - minX + 1;
  const contentHeight = maxY - minY + 1;
  const contentAreaRatio = (contentWidth * contentHeight) / (canvas.width * canvas.height);
  const blankMarginPercent = Math.round((1 - contentAreaRatio) * 100);

  if (blankMarginPercent < 12) {
    return { file, trimApplied: false, blankMarginPercent };
  }

  const padding = Math.round(Math.max(contentWidth, contentHeight) * 0.04);
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropWidth = Math.min(canvas.width - cropX, contentWidth + padding * 2);
  const cropHeight = Math.min(canvas.height - cropY, contentHeight + padding * 2);
  const output = document.createElement("canvas");
  output.width = cropWidth;
  output.height = cropHeight;
  const outputContext = output.getContext("2d");

  if (!outputContext) {
    return { file, trimApplied: false, blankMarginPercent };
  }

  outputContext.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, "image/png"));

  if (!blob) {
    return { file, trimApplied: false, blankMarginPercent };
  }

  const filename = `${file.name.replace(/\.[^.]+$/, "") || "logo"}-trimmed.png`;
  return { file: new File([blob], filename, { type: "image/png" }), trimApplied: true, blankMarginPercent };
}

function loadLogoImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Logo image could not be prepared."));
    };
    image.src = objectUrl;
  });
}

function isLogoContentPixel(red: number, green: number, blue: number, alpha: number) {
  if (alpha < 16) return false;
  return !(red >= 245 && green >= 245 && blue >= 245);
}

function ProofPreview({
  businessName,
  designAssistanceRequested = false,
  fontSizePercent,
  logoFitMode,
  logoMediaUrl,
  logoOffsetXPercent,
  logoOffsetYPercent,
  logoSizePercent,
  product,
  qrValue,
  templateUrl
}: {
  businessName: string;
  designAssistanceRequested?: boolean;
  fontSizePercent: number;
  logoFitMode: LogoFitMode;
  logoMediaUrl: string | undefined;
  logoOffsetXPercent: number;
  logoOffsetYPercent: number;
  logoSizePercent: number;
  product: ProductSetupChooserProduct;
  qrValue: string;
  templateUrl: string;
}) {
  return (
    <div className="tr-card p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <p className="text-sm font-semibold text-ink">Front proof preview</p>
      </div>
      <div className="mt-3 grid justify-items-center">
        {templateUrl ? (
          <TemplateProofPreview
            businessName={businessName}
            designAssistanceRequested={designAssistanceRequested}
            fontSizePercent={fontSizePercent}
            logoFitMode={logoFitMode}
            logoMediaUrl={logoMediaUrl}
            logoOffsetXPercent={logoOffsetXPercent}
            logoOffsetYPercent={logoOffsetYPercent}
            logoSizePercent={logoSizePercent}
            qrValue={qrValue}
            templateUrl={templateUrl}
          />
        ) : (
          <CleanProofPreview
            businessName={businessName}
            designAssistanceRequested={designAssistanceRequested}
            fontSizePercent={fontSizePercent}
            logoFitMode={logoFitMode}
            logoMediaUrl={logoMediaUrl}
            logoOffsetXPercent={logoOffsetXPercent}
            logoOffsetYPercent={logoOffsetYPercent}
            logoSizePercent={logoSizePercent}
            product={product}
            qrValue={qrValue}
          />
        )}
      </div>
    </div>
  );
}

function TemplateProofPreview({
  businessName,
  designAssistanceRequested,
  fontSizePercent,
  logoFitMode,
  logoMediaUrl,
  logoOffsetXPercent,
  logoOffsetYPercent,
  logoSizePercent,
  qrValue,
  templateUrl
}: {
  businessName: string;
  designAssistanceRequested: boolean;
  fontSizePercent: number;
  logoFitMode: LogoFitMode;
  logoMediaUrl: string | undefined;
  logoOffsetXPercent: number;
  logoOffsetYPercent: number;
  logoSizePercent: number;
  qrValue: string;
  templateUrl: string;
}) {
  return (
    <div className="relative mx-auto aspect-[1278/1949] w-full max-w-[320px] overflow-hidden rounded-lg border border-line bg-white">
      <img src={templateUrl} alt="Branded front template proof" className="absolute inset-0 h-full w-full object-contain" />
      <div className="absolute grid place-items-center overflow-hidden p-[2%]" style={regionStyle(brandedStandComposition.logoRegion)}>
        {logoMediaUrl ? (
          <img
            src={logoMediaUrl}
            alt="Uploaded business logo"
            style={logoImageStyle({ fitMode: logoFitMode, logoSizePercent, offsetXPercent: logoOffsetXPercent, offsetYPercent: logoOffsetYPercent })}
          />
        ) : (
          <span className="rounded-lg border border-dashed border-line bg-white/90 px-3 py-1 text-center text-[9px] font-black uppercase leading-tight text-muted">
            {designAssistanceRequested ? "Proof by Tap Rater" : "Logo zone"}
          </span>
        )}
      </div>
      <p
        className="absolute overflow-hidden text-center font-black leading-tight text-ink"
        style={{
          ...regionStyle(brandedStandComposition.businessNameRegion),
          fontSize: `${17 * fontSizePercent / 100}px`
        }}
      >
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
  designAssistanceRequested,
  fontSizePercent,
  logoFitMode,
  logoMediaUrl,
  logoOffsetXPercent,
  logoOffsetYPercent,
  logoSizePercent,
  product,
  qrValue
}: {
  businessName: string;
  designAssistanceRequested: boolean;
  fontSizePercent: number;
  logoFitMode: LogoFitMode;
  logoMediaUrl: string | undefined;
  logoOffsetXPercent: number;
  logoOffsetYPercent: number;
  logoSizePercent: number;
  product: ProductSetupChooserProduct;
  qrValue: string;
}) {
  return (
    <div className="mx-auto grid aspect-[0.68] w-full max-w-[390px] justify-items-center rounded-lg border border-line bg-white p-5 text-center">
      <div className="grid min-h-16 w-full place-items-center overflow-hidden rounded-lg border border-dashed border-line bg-soft p-2">
        {logoMediaUrl ? (
          <img
            src={logoMediaUrl}
            alt="Uploaded business logo"
            style={logoImageStyle({ fitMode: logoFitMode, logoSizePercent, offsetXPercent: logoOffsetXPercent, offsetYPercent: logoOffsetYPercent })}
          />
        ) : (
          <span className="text-xs font-black uppercase text-muted">{designAssistanceRequested ? "Proof by Tap Rater" : "Logo zone"}</span>
        )}
      </div>
      <p className="mt-3 max-w-full break-words font-black uppercase text-ink" style={{ fontSize: `${0.875 * fontSizePercent / 100}rem` }}>
        {businessName || "Business name"}
      </p>
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

function logoImageStyle({
  fitMode,
  logoSizePercent,
  offsetXPercent,
  offsetYPercent
}: {
  fitMode: LogoFitMode;
  logoSizePercent: number;
  offsetXPercent: number;
  offsetYPercent: number;
}): CSSProperties {
  const scale = Math.max(0.4, Math.min(1.8, logoSizePercent / 100));
  const dimension = `${Math.round(100 * scale)}%`;

  return {
    display: "block",
    height: fitMode === "fill" ? dimension : "auto",
    maxHeight: fitMode === "contain" ? dimension : "none",
    maxWidth: fitMode === "contain" ? dimension : "none",
    objectFit: fitMode === "fill" ? "cover" : "contain",
    transform: `translate(${offsetXPercent}%, ${offsetYPercent}%)`,
    width: fitMode === "fill" ? dimension : "auto"
  };
}

function QrPreview({ value, variant = "framed" }: { value: string; variant?: "framed" | "template" }) {
  const [qrSvg, setQrSvg] = useState("");
  const [qrError, setQrError] = useState("");
  const className =
    variant === "template"
      ? "grid h-full w-full place-items-center bg-white p-px"
      : "grid h-20 w-20 place-items-center border-4 border-ink bg-white p-px";

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

function loadProductGooglePlaces(apiKey: string) {
  if (window.google?.maps?.places?.Autocomplete) {
    return Promise.resolve();
  }

  if (!productGoogleMapsScriptPromise) {
    productGoogleMapsScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-taprater-google-places="true"]');
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Google Maps script failed to load.")));
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.dataset.tapraterGooglePlaces = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Google Maps script failed to load."));
      document.head.appendChild(script);
    });
  }

  return productGoogleMapsScriptPromise;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
