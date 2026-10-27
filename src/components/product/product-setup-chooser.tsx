"use client";

import { quoteOffers, singleStandPrice, type OffersSettings } from "@/lib/offers";
import Image from "next/image";
import Link from "next/link";
import type { ShippingSettingsInput } from "@/lib/validators";
import { useRouter } from "next/navigation";
import { CheckCircle2, ImageUp, Minus, Plus, RotateCcw, Search, Trash2, UploadCloud, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { maxCartItemQuantity, type CartItem } from "@/lib/cart";
import type { ReadyBrandedProof } from "@/components/product/branded-proof-preview";
import type { UploadedLogo, LogoBackgroundMode, LogoFitMode } from "./product-setup-types";
import dynamic from "next/dynamic";
import { QR_CODE_ERROR_MESSAGE } from "@/lib/qr-code-message";
const ProofControls = dynamic(() => import("./proof-controls").then(m => m.ProofControls));
const QrPreview = dynamic(() => import("./qr-preview").then(m => m.QrPreview));
const BrandedProofPreview = dynamic(() => import("./branded-proof-preview").then(m => m.BrandedProofPreview));
import type { MigratedProduct } from "@/data/migrated-products";
import { formatPrice } from "@/lib/products";
import { getProductPurchaseOptions, isHostedPurchaseOptionEnabled, type PurchaseOption, type PurchaseOptionId } from "@/lib/purchase-options";
import { generateProductVariantSku, getConfiguredUnitPriceCents, getDefaultProductColor, getDefaultProductSize, getDefaultPurchasableProductSize, getProductBaseSku } from "@/lib/product-model";

import { buildDirectProductionTargets } from "@/lib/direct-production";
import { searchGoogleBusinesses, type GoogleBusinessSelection } from "@/lib/google-places-client";
import { hostedMultiLinkServiceAddon, productSupportsMultiLink } from "@/lib/service-addons";
import { getHostedButtonMark, hostedPageButtonLimit, supportedHostedPageButtons, type HostedPageEditorButton, type HostedPageEditorButtonType } from "@/lib/hosted-page-editor-shared";
import { optimizedUploadSrc } from "@/lib/optimized-upload";
import { readReviewLinkDraft, reviewLinkDraftKey } from "@/lib/review-link-draft";

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

type SetupStep = "choose" | "destination" | "links" | "design" | "review" | "confirmation";
type LinkExperienceId = "direct" | "multilink";
type MultiLinkDraftButton = Pick<HostedPageEditorButton, "id" | "type" | "label" | "url" | "enabled" | "position">;

type ProductSetupChooserProps = {
  initialQuantity?: number;
  fixedSelection?: boolean;
  onAdded?: (item: CartItem) => void;
  product: ProductSetupChooserProduct;
  offers?: OffersSettings | null;
  shipping?: ShippingSettingsInput;
  selectedOptionId?: PurchaseOptionId;
  onSelectedOptionChange?: (optionId: PurchaseOptionId) => void;
  onSelectedPriceChange?: (priceCents: number | null) => void;
  onSelectedMonthlyPriceChange?: (priceCents: number) => void;
};

export function ProductSetupChooser({ product, offers, shipping, initialQuantity = 1, fixedSelection = false, onAdded, selectedOptionId: controlledSelectedOptionId, onSelectedOptionChange, onSelectedPriceChange, onSelectedMonthlyPriceChange }: ProductSetupChooserProps) {
  const options = useMemo(() => getProductPurchaseOptions(product), [product]);
  const [uncontrolledSelectedOptionId, setUncontrolledSelectedOptionId] = useState<PurchaseOptionId>(options[0]?.id ?? "standard_direct");
  const [selectedLinkExperience, setSelectedLinkExperience] = useState<LinkExperienceId>("direct");
  const [step, setStep] = useState<SetupStep>("choose");
  const [destinationUrl, setDestinationUrl] = useState("");
  useEffect(() => {
    if (product.slug !== "google-review-stand") return;
    try {
      const saved = readReviewLinkDraft(sessionStorage.getItem(reviewLinkDraftKey));
      if (saved) {
        setDestinationUrl((current) => current || saved.url);
        setBusinessName((current) => current || saved.businessName);
        setGooglePlaceName((current) => current || saved.businessName);
        const params = new URLSearchParams(window.location.search);
        if (params.get("setup") === "review" && ["standard", "branded"].includes(params.get("design") || "")) {
          setStep(params.get("design") === "standard" ? "review" : "destination");
          setIsBuilderOpen(true);
        }
      }
    } catch { /* Manual entry remains available when storage is blocked. */ }
  }, [product.slug]);
  const [googleSearchQuery, setGoogleSearchQuery] = useState("");
  const [googleAutocompleteStatus, setGoogleAutocompleteStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");
  const [googleSearchResults, setGoogleSearchResults] = useState<GoogleBusinessSelection[]>([]);
  const [googlePlaceId, setGooglePlaceId] = useState("");
  const [googlePlaceName, setGooglePlaceName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [multiLinkButtons, setMultiLinkButtons] = useState<MultiLinkDraftButton[]>(() => createInitialMultiLinkButtons());
  const [logo, setLogo] = useState<UploadedLogo | null>(null);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [selectedSizeCode, setSelectedSizeCode] = useState(() => getDefaultProductSize(product)?.code ?? "");
  const [selectedColorCode, setSelectedColorCode] = useState(() => getDefaultProductColor(product)?.code ?? "");
  const [proofFontSizePercent, setProofFontSizePercent] = useState(100);
  const [proofLogoSizePercent, setProofLogoSizePercent] = useState(100);
  const [showBusinessNameOnProof, setShowBusinessNameOnProof] = useState(true);
  const [logoBackgroundMode, setLogoBackgroundMode] = useState<LogoBackgroundMode>("auto_crop");
  const [logoFitMode, setLogoFitMode] = useState<LogoFitMode>("contain");
  const [logoOffsetXPercent, setLogoOffsetXPercent] = useState(0);
  const [logoOffsetYPercent, setLogoOffsetYPercent] = useState(0);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [readyProof, setReadyProof] = useState<ReadyBrandedProof | null>(null);
  const [approvedProofId, setApprovedProofId] = useState("");
  const [hostedReservation, setHostedReservation] = useState<{ id: string; url: string } | null>(null);
  const [isReservingDestination, setIsReservingDestination] = useState(false);
  const [error, setError] = useState("");
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const builderContentRef = useRef<HTMLDivElement>(null);
  const builderHeadingRef = useRef<HTMLHeadingElement>(null);
  const builderHeadingId = useId();
  const cart = useCart();
  const router = useRouter();
  const requestedOptionId = controlledSelectedOptionId ?? uncontrolledSelectedOptionId;
  const selectedOption = options.find((option) => option.id === requestedOptionId) ?? options[0];
  const selectedOptionId = selectedOption?.id;
  const supportsMultiLink = !fixedSelection && productSupportsMultiLink(product);
  const hostedPurchasingEnabled = isHostedPurchaseOptionEnabled();
  const activeSizes = product.sizeOptions?.filter((size) => size.isActive) ?? [];
  const purchasableSizes = activeSizes.filter((size) => size.priceAdjustmentCents !== null);
  const defaultPurchasableSize = getDefaultPurchasableProductSize(product);
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
  const proofFrontTemplateUrl = product.assetSet?.brandedFrontTemplateUrl ?? "";
  const selectedLogoMediaUrl = logoBackgroundMode === "original" ? logo?.originalMediaUrl ?? logo?.mediaUrl : logo?.mediaUrl;
  const selectedLogoStorageKey = logoBackgroundMode === "original" ? logo?.originalStorageKey ?? logo?.storageKey : logo?.storageKey;
  const setupOptions = fixedSelection ? options.filter(option => option.id === selectedOptionId) : options;
  const generatedQrValue = destinationUrl.trim();
  const proofQrValue = selectedLinkExperience === "multilink" ? hostedReservation?.url ?? "" : generatedQrValue;
  const directTargets = buildDirectProductionTargets(destinationUrl);
  const quantityEnabled = selectedLinkExperience === "direct";
  const selectedQuantity = quantityEnabled ? quantity : 1;
  const proofSetup: NonNullable<CartItem["setup"]> = {
    productSlug: product.slug, optionCode: "branded_qr_direct",
    serviceAddon: selectedLinkExperience === "multilink" ? hostedMultiLinkServiceAddon.code : undefined,
    hostedReservationId: selectedLinkExperience === "multilink" ? hostedReservation?.id : undefined,
    destinationUrl: selectedLinkExperience === "direct" ? destinationUrl.trim() : undefined,
    businessName: businessName.trim(), logoStorageKey: selectedLogoStorageKey, logoMediaUrl: selectedLogoMediaUrl,
    generatedQrValue: proofQrValue, qrTargetUrl: proofQrValue, frontTemplateUrl: proofFrontTemplateUrl,
    fontSizePercent: proofFontSizePercent, logoSizePercent: proofLogoSizePercent,
    showBusinessNameOnProof, logoBackgroundMode, logoFitMode, logoOffsetXPercent, logoOffsetYPercent
  };
  const proofIsReady = Boolean(readyProof && readyProof.draftKey === JSON.stringify(proofSetup) && !isUploadingLogo);
  const proofIsApproved = proofIsReady && approvedProofId === readyProof?.proofReceiptId;
  useEffect(() => {
    if (!isBuilderOpen || !builderContentRef.current) return;
    builderContentRef.current.scrollTop = 0;
    builderHeadingRef.current?.focus({ preventScroll: true });
  }, [isBuilderOpen, step]);

  useEffect(() => {
    if (!selectedSize || selectedSize.code === selectedSizeCode) return;
    setSelectedSizeCode(selectedSize.code);
  }, [selectedSize, selectedSizeCode]);

  useEffect(() => {
    onSelectedPriceChange?.(configuredUnitPriceCents);
  }, [configuredUnitPriceCents, onSelectedPriceChange]);

  useEffect(() => {
    onSelectedMonthlyPriceChange?.(selectedLinkExperience === "multilink" ? hostedMultiLinkServiceAddon.monthlyPriceCents : 0);
  }, [selectedLinkExperience, onSelectedMonthlyPriceChange]);

  useEffect(() => {
    if (!isGoogleReviewProduct || step !== "destination") return;

    const normalizedQuery = googleSearchQuery.trim();
    if (normalizedQuery.length < 3 || googlePlaceId) {
      setGoogleSearchResults([]);
      setGoogleAutocompleteStatus("idle");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setGoogleAutocompleteStatus("loading");
      searchGoogleBusinesses(normalizedQuery, controller.signal)
        .then((result) => {
          setGoogleSearchResults(result.results);
          setGoogleAutocompleteStatus(result.configured && !result.message ? "ready" : "fallback");
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setGoogleSearchResults([]);
          setGoogleAutocompleteStatus("fallback");
        });
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [googlePlaceId, googleSearchQuery, isGoogleReviewProduct, step]);

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
    setStep("choose");
  }

  function setClampedQuantity(value: number) {
    if (!Number.isFinite(value)) {
      setQuantity(1);
      return;
    }

    setQuantity(Math.min(maxCartItemQuantity, Math.max(1, Math.trunc(value))));
  }

  function updateQuantityFromInput(value: string) {
    setClampedQuantity(Number(value));
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

  function useGooglePlace(place: GoogleBusinessSelection) {
    const selectedQuery = `${place.name}${place.formattedAddress ? ` - ${place.formattedAddress}` : ""}`;
    setGooglePlaceId(place.placeId);
    setGooglePlaceName(place.name);
    setGoogleSearchQuery(selectedQuery);
    setGoogleSearchResults([]);
    setGoogleAutocompleteStatus("idle");
    setDestinationUrl(place.reviewUrl);
    setBusinessName((current) => current || place.name);
    setError("");
  }

  async function continueFromDestination() {
    setError("");

    if (configuredUnitPriceCents === null) {
      setError("This size is not available for purchase yet.");
      return;
    }

    if (selectedLinkExperience === "multilink" && !businessName.trim()) {
      setError("Enter the business or page name for your Multi-Link page.");
      return;
    }

    if (selectedLinkExperience === "direct" && !isHttpUrl(destinationUrl)) {
      setError("Enter a valid destination link starting with http or https.");
      return;
    }

    if (selectedOption.id === "branded_qr_direct") {
      try {
        if (selectedLinkExperience === "multilink" && !hostedReservation) {
          setIsReservingDestination(true);
          const response = await fetch("/api/setup/proof", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reserve", item: { productId: product.slug, optionId: "branded_qr_direct", quantity: 1, setup: { serviceAddon: hostedMultiLinkServiceAddon.code } } }) });
          const result = await response.json();
          if (!response.ok || !result.reservation?.url) throw new Error(result.error || "The Multi-Link destination could not be reserved.");
          setHostedReservation(result.reservation);
          return;
        }
        await (await import("@/lib/qr-code")).createQrSvg(proofQrValue);
      } catch (error) {
        setError(error instanceof Error ? error.message : QR_CODE_ERROR_MESSAGE);
        return;
      } finally { setIsReservingDestination(false); }
    }
    setStep(selectedLinkExperience === "multilink" ? "links" : selectedOption.id === "branded_qr_direct" ? "design" : "review");
  }

  function continueFromMultiLinkLinks({ skip = false }: { skip?: boolean } = {}) {
    setError("");

    if (skip) {
      setMultiLinkButtons([]);
    } else {
      const normalized = normalizeMultiLinkButtonsForSetup(multiLinkButtons);
      if (normalized.error) {
        setError(normalized.error);
        return;
      }
    }

    setStep(selectedOption.id === "branded_qr_direct" ? "design" : "review");
  }

  async function uploadLogo(file: File | undefined) {
    setError("");

    if (!file) {
      return;
    }

    setIsUploadingLogo(true);

    try {
      const preparedLogo = await (await import("./logo-upload")).prepareLogoUpload(file);
      const originalAsset = await (await import("./logo-upload")).uploadLogoAsset(file, product.slug);
      const processedAsset = preparedLogo.file === file ? originalAsset : await (await import("./logo-upload")).uploadLogoAsset(preparedLogo.file, product.slug);

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
    } catch (error) {
      setLogo(null);
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

    if (!logo) {
      setError("Upload your business logo before adding this stand to cart. If you need help, contact Tap Rater and upload your file there.");
      return;
    }

    setStep("confirmation");
  }

  function continueFromProof() {
    setError("");

    if (selectedOption.id === "branded_qr_direct" && !logo) {
      setError("Upload your business logo before continuing.");
      return;
    }

    setStep("confirmation");
  }

  function goToPreviousStep() {
    setError("");
    if (step === "confirmation") {
      setStep(selectedOption.id === "branded_qr_direct" ? "design" : "review");
      return;
    }

    if (step === "review") {
      setStep(selectedLinkExperience === "multilink" ? "links" : selectedOption.id === "branded_qr_direct" ? "design" : "destination");
      return;
    }

    if (step === "design") {
      setStep(selectedLinkExperience === "multilink" ? "links" : "destination");
      return;
    }

    if (step === "links") {
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

    const normalizedMultiLinkButtons = selectedLinkExperience === "multilink" ? normalizeMultiLinkButtonsForSetup(multiLinkButtons) : { buttons: [] };

    if (normalizedMultiLinkButtons.error) {
      setError(normalizedMultiLinkButtons.error);
      setStep("links");
      return;
    }

    if (selectedOption.id === "branded_qr_direct") {
      if (!proofIsApproved || !readyProof) {
        setError("Preview and approve your artwork before payment.");
        setStep("confirmation");
        return;
      }
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

      if (!proofFrontTemplateUrl) {
        setError("Branded artwork is not configured for this product yet.");
        setStep("design");
        return;
      }

    }

    const configuredItem: CartItem = {
      productId: product.slug,
      optionId: selectedOption.id,
      quantity: selectedQuantity,
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
        destinationUrl: selectedLinkExperience === "direct" ? directTargets?.destinationUrl : undefined,
        destinationType: product.destinationType,
        serviceMode: selectedLinkExperience === "multilink" ? "HOSTED" : "DIRECT",
        serviceAddon: selectedLinkExperience === "multilink" ? hostedMultiLinkServiceAddon.code : undefined,
        monthlyPriceCents: selectedLinkExperience === "multilink" ? hostedMultiLinkServiceAddon.monthlyPriceCents : undefined,
        multiLinkButtons: selectedLinkExperience === "multilink" ? normalizedMultiLinkButtons.buttons : undefined,
        multiLinkLinksSkipped: selectedLinkExperience === "multilink" ? normalizedMultiLinkButtons.buttons.length === 0 : undefined,
        platformSlug: product.primaryPlatformSlug,
        googlePlaceId: googlePlaceId || undefined,
        googlePlaceName: googlePlaceName || undefined,
        businessName: selectedOption.requiresBusinessName || selectedLinkExperience === "multilink" ? businessName.trim() : undefined,
        logoFileName: logoBackgroundMode === "original" ? logo?.originalFilename ?? logo?.filename : logo?.filename,
        logoMediaUrl: selectedLogoMediaUrl,
        logoStorageKey: selectedLogoStorageKey,
        originalLogoMediaUrl: logo?.originalMediaUrl,
        originalLogoStorageKey: logo?.originalStorageKey,
        logoBackgroundMode: selectedOption.id === "branded_qr_direct" ? logoBackgroundMode : undefined,
        logoFitMode: selectedOption.id === "branded_qr_direct" ? logoFitMode : undefined,
        logoOffsetXPercent: selectedOption.id === "branded_qr_direct" ? logoOffsetXPercent : undefined,
        logoOffsetYPercent: selectedOption.id === "branded_qr_direct" ? logoOffsetYPercent : undefined,
        showBusinessNameOnProof: selectedOption.id === "branded_qr_direct" ? showBusinessNameOnProof : undefined,
        generatedQrValue: selectedOption.hasQr ? proofQrValue : undefined,
        qrTargetUrl: selectedOption.hasQr ? proofQrValue : undefined,
        nfcTargetUrl: directTargets?.nfcTargetUrl,
        frontTemplateUrl: selectedOption.hasQr ? proofFrontTemplateUrl || undefined : product.assetSet?.standardFrontTemplateUrl || undefined,
        fontSizePercent: selectedOption.id === "branded_qr_direct" ? proofFontSizePercent : undefined,
        logoSizePercent: selectedOption.id === "branded_qr_direct" ? proofLogoSizePercent : undefined,
        hasQr: selectedOption.hasQr,
        nfcOnly: !selectedOption.hasQr,
        priceCents: configuredUnitPriceCents,
        proofApproved: selectedOption.id === "branded_qr_direct" ? proofIsApproved : true,
        ...(selectedOption.id === "branded_qr_direct" && readyProof ? {
          ...readyProof.snapshot,
          optionCode: selectedOption.id,
          proofApprovalSnapshot: readyProof.snapshot,
          proofApprovedAt: new Date().toISOString(),
          proofReceiptId: readyProof.proofReceiptId,
          hostedReservationId: selectedLinkExperience === "multilink" ? hostedReservation?.id : undefined
        } : {})
      }
    };
    cart.addItem(configuredItem);
    if (onAdded) { setIsBuilderOpen(false); onAdded(configuredItem); }
    else router.push("/cart");
  }

  const modalTitle =
    selectedLinkExperience === "multilink"
      ? "Set up your Multi-Link stand"
      : selectedOption.id === "branded_qr_direct"
        ? "Build your Branded QR stand"
        : "Set up your Standard Direct stand";
  const standQuote = !fixedSelection && configuredUnitPriceCents !== null && selectedOptionId && offers
    ? quoteOffers([{ productId: product.slug, optionId: selectedOptionId, quantity: selectedQuantity, unitAmountCents: configuredUnitPriceCents }], offers) : null;
  const selectedPrice =
    configuredUnitPriceCents === null
        ? "Unavailable"
        : formatPrice(standQuote ? Math.round(standQuote.subtotalCents / selectedQuantity) : configuredUnitPriceCents).replace(".00", "");
  const selectedStandTotalPrice =
    configuredUnitPriceCents === null
        ? "Unavailable"
        : formatPrice(standQuote?.subtotalCents ?? configuredUnitPriceCents * selectedQuantity).replace(".00", "");
  const setupAction = selectedQuantity > 1 ? `Set Up My ${selectedQuantity} Stands` : "Set Up My Stand";
  const setupButtonLabel = fixedSelection ? setupAction : `${setupAction} - ${selectedStandTotalPrice}`;
  const stepLabels =
    selectedLinkExperience === "multilink" && selectedOption.id === "branded_qr_direct"
      ? ["Destination", "Links", "Logo", "Preview"]
      : selectedLinkExperience === "multilink"
        ? ["Business", "Links", "Confirm"]
        : selectedOption.id === "branded_qr_direct"
          ? ["Destination", "Logo", "Preview"]
        : ["Destination", "Confirm"];
  const stepGridClassName =
    selectedLinkExperience === "multilink" && selectedOption.id === "branded_qr_direct"
      ? "grid-cols-4"
      : selectedLinkExperience === "multilink"
        ? "grid-cols-3"
        : selectedOption.id === "branded_qr_direct"
          ? "grid-cols-3"
          : "grid-cols-2";
  const stepOrder: SetupStep[] =
    selectedLinkExperience === "multilink" && selectedOption.id === "branded_qr_direct"
      ? ["destination", "links", "design", "confirmation"]
      : selectedLinkExperience === "multilink"
        ? ["destination", "links", "review"]
        : selectedOption.id === "branded_qr_direct"
          ? ["destination", "design", "confirmation"]
          : ["destination", "review"];
  const activeStepIndex = Math.max(0, stepOrder.indexOf(step));

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
                  ? "tr-design-option grid min-h-[96px] cursor-pointer grid-cols-[auto_1fr] gap-3 rounded-md border border-brand bg-panel p-3 transition"
                  : "tr-design-option grid min-h-[96px] cursor-pointer grid-cols-[auto_1fr] gap-3 rounded-md border border-line bg-white p-3 transition hover:border-brand/50 hover:bg-soft"
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
                  <span className="shrink-0 text-sm font-black text-ink">{formatPrice(singleStandPrice(product.slug, option.id, option.priceCents, offers)).replace(".00", "")}</span>
                </span>
                <span className="mt-1 block text-sm font-semibold leading-5 text-ink">{product.slug === "google-review-stand" && option.id === "standard_direct" ? "NFC tap only · No printed QR" : product.slug === "google-review-stand" && option.id === "branded_qr_direct" ? "NFC + QR · Your logo + business name" : getOptionShortSummary(option)}</span>
                <span className="mt-1 block text-xs leading-5 text-muted">{getOptionSummary(option)}</span>
                {product.slug === "google-review-stand" && option.id !== "hosted_multilink" ? <span className="mt-1 block text-xs leading-5 text-muted">{option.id === "standard_direct" ? "Ready-made design · No subscription" : "Custom design · No subscription"}</span> : null}
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
            <p className="text-sm font-black text-ink">Services & add-ons</p>
            <label
              className={
                selectedLinkExperience === "multilink"
                  ? "grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-md border border-brand bg-panel p-3 transition"
                  : "grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-md border border-line bg-white p-3 transition hover:border-brand/50 hover:bg-soft"
              }
            >
              <input
                type="checkbox"
                checked={selectedLinkExperience === "multilink"}
                disabled={!hostedPurchasingEnabled}
                onChange={(event) => {
                  setSelectedLinkExperience(event.target.checked ? "multilink" : "direct");
                  if (event.target.checked) {
                    setQuantity(1);
                  }
                  setError("");
                }}
                className="mt-1 h-4 w-4 shrink-0 accent-brand disabled:cursor-not-allowed"
              />
              <span className="min-w-0">
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-base font-black leading-5 text-ink">Add Multi-Link hosted page</span>
                    <span className="mt-1 block text-sm font-semibold leading-5 text-ink md:whitespace-nowrap">
                      Optional add-on. {selectedOption.hasQr ? "QR + NFC open" : "NFC opens"} an editable Tap Rater page with up to 10 links.
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-black text-ink">+{formatPrice(hostedMultiLinkServiceAddon.monthlyPriceCents).replace(".00", "")}/mo</span>
                </span>
              </span>
            </label>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-white p-3">
          <div>
            <p className="text-sm font-black text-ink">Qty</p>
            <p className="text-xs font-semibold leading-5 text-muted">
              {quantityEnabled
                ? configuredUnitPriceCents === null
                  ? "Select an available size"
                  : `${selectedPrice} each`
                : "One Multi-Link page per setup"}
            </p>
          </div>
          <div className="flex h-11 items-center overflow-hidden rounded-lg border border-line bg-white">
            <button
              type="button"
              aria-label="Decrease quantity"
              className="grid h-11 w-11 place-items-center text-ink transition hover:bg-soft disabled:cursor-not-allowed disabled:text-muted"
              disabled={fixedSelection || !quantityEnabled || selectedQuantity <= 1}
              onClick={() => setClampedQuantity(selectedQuantity - 1)}
            >
              <Minus size={16} />
            </button>
            <input
              type="number"
              min={1}
              max={maxCartItemQuantity}
              inputMode="numeric"
              aria-label="Quantity"
              className="h-11 w-16 border-x border-line text-center text-base font-black text-ink outline-none disabled:bg-soft disabled:text-muted"
              disabled={fixedSelection || !quantityEnabled}
              value={selectedQuantity}
              onChange={(event) => updateQuantityFromInput(event.target.value)}
            />
            <button
              type="button"
              aria-label="Increase quantity"
              className="grid h-11 w-11 place-items-center text-ink transition hover:bg-soft disabled:cursor-not-allowed disabled:text-muted"
              disabled={fixedSelection || !quantityEnabled || selectedQuantity >= maxCartItemQuantity}
              onClick={() => setClampedQuantity(selectedQuantity + 1)}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {shipping ? <p className="text-sm leading-6 text-muted">
          {shipping.shippingMode === "free" ? "Free shipping on supported orders." : shipping.shippingMode === "manual" ? "Shipping is reviewed after the order." : `Shipping: ${formatPrice(shipping.flatShippingAmountCents)}.`}
          {shipping.shippingMode === "flat" && offers?.shipping.enabled ? ` Free at ${formatPrice(offers.shipping.thresholdCents)} in merchandise after discounts (${offers.shipping.countryCodes.join(", ")}).` : ""}{" "}
          <Link href="/shipping" className="font-semibold text-brand underline">Delivery estimates</Link>
        </p> : null}
        <div className="tr-purchase-action" data-builder-open={isBuilderOpen}>
        {shipping?.shippingMode === "flat" ? <p className="mb-1 text-center text-xs text-muted">{formatPrice(shipping.flatShippingAmountCents)} US shipping{offers?.shipping.enabled ? ` · Free at ${formatPrice(offers.shipping.thresholdCents)} after discounts` : ""}</p> : shipping?.shippingMode === "free" ? <p className="mb-1 text-center text-xs text-muted">Free shipping on supported orders</p> : null}
        <button
          type="button"
          className="tr-button-primary w-full"
          disabled={configuredUnitPriceCents === null || (selectedLinkExperience === "multilink" && !hostedPurchasingEnabled)}
          onClick={() => selectedOptionId && openBuilder(selectedOptionId)}
        >
          {selectedLinkExperience === "multilink" && !hostedPurchasingEnabled
            ? "Multi-Link Checkout Coming Soon"
            : `${setupButtonLabel}${selectedLinkExperience === "multilink" ? ` + ${formatPrice(hostedMultiLinkServiceAddon.monthlyPriceCents).replace(".00", "")}/mo` : ""}`}
        </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-muted">
          <span>{selectedOption.hasQr ? "QR + NFC" : "NFC only · No printed QR"}</span>
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
        <ModalDialog labelledBy={builderHeadingId} onClose={closeBuilder} className="px-3 py-4 backdrop:backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden bg-white" style={{ borderRadius: "var(--tr-radius-card)", boxShadow: "var(--tr-shadow-elevated)" }}>
            <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3 sm:px-6 sm:py-4">
              <div className="min-w-0">
                <p className="tr-eyebrow">{product.title}</p>
                <h2 ref={builderHeadingRef} id={builderHeadingId} tabIndex={-1} data-dialog-heading className="mt-1 break-words text-xl font-semibold text-ink focus:outline-none sm:text-2xl">{modalTitle}</h2>
              </div>
              <button type="button" className="tr-icon-button shrink-0" onClick={closeBuilder} aria-label="Close builder">
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-line px-4 py-3 sm:px-6">
              <ol className={`grid gap-2 text-[10px] font-semibold uppercase text-muted sm:text-xs ${stepGridClassName}`}>
                {stepLabels.map((label, index) => (
                  <li key={label} className={index < activeStepIndex ? "rounded-lg bg-panel text-brand" : index === activeStepIndex ? "rounded-lg bg-ink text-white" : "rounded-lg border border-line"}>
                    <button
                      type="button"
                      className="flex h-full min-h-12 w-full min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-center disabled:cursor-default sm:min-h-0 sm:flex-row sm:justify-start sm:gap-0 sm:px-3 sm:text-left"
                      disabled={index >= activeStepIndex}
                      onClick={() => {
                        const targetStep = stepOrder[index];
                        if (targetStep) setStep(targetStep);
                      }}
                    >
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/80 text-[11px] text-ink sm:mr-2">{index + 1}</span>
                      <span className="min-w-0 leading-3 sm:leading-normal">{label}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>

            <div ref={builderContentRef} className="overflow-y-auto px-4 py-3 sm:px-6">
              {step !== "destination" ? (
                <button type="button" className="mb-3 text-sm font-semibold text-brand hover:text-ink" onClick={goToPreviousStep}>
                  Back to previous step
                </button>
              ) : null}

              {step === "destination" ? (
                <div className="grid gap-4">
                  {selectedLinkExperience === "multilink" ? (
                    <>
                      <div>
                        <p className="text-sm font-semibold text-ink">Multi-Link page</p>
                        <p className="mt-1 text-sm leading-6 text-muted">
                          Enter the business or page name for the hosted Tap Rater page. You can add and edit the links after checkout.
                        </p>
                      </div>

                      <label className="grid gap-2 text-sm font-semibold text-ink">
                        Business or page name
                        <input
                          className="tr-input"
                          value={businessName}
                          onChange={(event) => {
                            setBusinessName(event.target.value);
                          }}
                          placeholder="Your business name"
                        />
                      </label>

                      <p className="rounded-md border border-dashed border-line bg-soft p-3 text-sm leading-6 text-muted">
                        {selectedOption.hasQr ? "QR and NFC will open your permanent Multi-Link page." : "NFC will open your Multi-Link page. Standard does not include a printed QR."}
                      </p>
                    </>
                  ) : (
                    <>
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
                                  if (googlePlaceId) {
                                    setGooglePlaceId("");
                                    setGooglePlaceName("");
                                    setDestinationUrl("");
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

                          {googleAutocompleteStatus === "idle" && !googlePlaceId ? (
                            <p className="text-sm text-muted" role="status">Enter at least 3 characters to search.</p>
                          ) : null}

                          {googleAutocompleteStatus === "ready" && googleSearchResults.length === 0 && !googlePlaceId ? (
                            <p className="text-sm text-muted" role="status">No matching businesses found. Add a city or paste the review URL manually.</p>
                          ) : null}

                          {googleSearchResults.length > 0 ? (
                            <div className="grid overflow-hidden rounded-md border border-line bg-white" role="listbox" aria-label="Google Business search results">
                              {googleSearchResults.map((place) => (
                                <button
                                  key={place.placeId}
                                  type="button"
                                  role="option"
                                  aria-selected={false}
                                  className="border-b border-line px-3 py-3 text-left text-sm transition last:border-b-0 hover:bg-soft"
                                  onClick={() => useGooglePlace(place)}
                                >
                                  <span className="block font-semibold text-ink">{place.name}</span>
                                  {place.formattedAddress ? <span className="mt-1 block text-muted">{place.formattedAddress}</span> : null}
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
                          }}
                          placeholder={isGoogleReviewProduct ? "https://search.google.com/local/writereview?placeid=..." : "https://example.com"}
                        />
                      </label>

                      {googlePlaceName ? (
                        <p className="tr-status-success">
                          Selected Google business: {googlePlaceName}
                        </p>
                      ) : null}
                    </>
                  )}
                  {selectedOption.hasQr && isHttpUrl(proofQrValue) ? (
                    <div className="flex min-w-0 items-center gap-4 border-t border-line pt-3">
                      <div className="h-28 w-28 shrink-0"><QrPreview value={proofQrValue} variant="template" /></div>
                      <div className="min-w-0"><p className="text-sm font-semibold text-ink">QR destination</p><a href={proofQrValue} target="_blank" rel="noopener noreferrer" className="text-sm text-brand [overflow-wrap:anywhere]">{proofQrValue}</a></div>
                    </div>
                  ) : null}
                  <BuilderSummary
                    className="sm:order-first"
                    image={selectedImage}
                    option={selectedOption}
                    productTitle={product.title}
                    quantity={selectedQuantity}
                    unitPriceCents={standQuote ? Math.round(standQuote.subtotalCents / selectedQuantity) : configuredUnitPriceCents}
                    linkExperience={selectedLinkExperience}
                  />
                </div>
              ) : null}

              {step === "links" && selectedLinkExperience === "multilink" ? (
                <MultiLinkSetupStep
                  businessName={businessName}
                  buttons={multiLinkButtons}
                  onButtonsChange={setMultiLinkButtons}
                />
              ) : null}

              {step === "design" && selectedOption.id === "branded_qr_direct" ? (
                <div className="grid gap-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">Logo + business name</p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      Add your logo and business name for the stand.
                    </p>
                  </div>

                  <label className="grid gap-2 text-sm font-semibold text-ink">
                    Business name
                    <input
                      className="tr-input"
                      value={businessName}
                      onChange={(event) => {
                        setBusinessName(event.target.value);
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
                  <div className="rounded-lg border border-line bg-soft p-3 text-sm leading-6 text-muted">
                    Need Tap Rater to prepare or fix your logo? Use Contact Us and upload your file before ordering.
                    <a className="ml-2 font-semibold text-brand hover:text-ink" href="/contact-us">Contact Us</a>
                  </div>

                </div>
              ) : null}

              {step === "review" ? (
                <div className="grid gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">Confirm setup</p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {selectedLinkExperience === "multilink"
                        ? "Confirm the hosted Multi-Link setup before adding this stand to cart."
                        : "Confirm the direct destination link before adding this stand to cart. The NFC tap opens this URL."}
                    </p>
                  </div>

                  <div className="tr-panel-muted grid gap-x-4 gap-y-1 text-sm text-muted sm:grid-cols-2">
                    <ReviewLine label="Product" value={product.title} />
                    <ReviewLine label="Setup" value={selectedOption.label} />
                    {selectedSize ? <ReviewLine label="Size" value={selectedSize.label} /> : null}
                    {selectedColor ? <ReviewLine label="Color" value={selectedColor.label} /> : null}
                    <ReviewLine label="Qty" value={String(selectedQuantity)} />
                    <ReviewLine label="Price" value={configuredUnitPriceCents === null ? "Price pending" : formatPrice(standQuote?.subtotalCents ?? configuredUnitPriceCents * selectedQuantity)} />
                    {selectedLinkExperience !== "multilink" ? <ReviewLine label="Destination link" value={destinationUrl || "-"} /> : null}
                    {googlePlaceName ? <ReviewLine label="Google business" value={googlePlaceName} /> : null}
                  </div>

                  <div className="rounded-lg border border-line bg-white p-3 text-sm leading-6 text-muted">
                    {selectedLinkExperience === "multilink" ? (
                      <>
                        <p className="font-semibold text-ink">Multi-Link confirmation</p>
                        <p>{selectedOption.hasQr ? "QR and NFC will open" : "NFC will open"} your hosted Tap Rater Multi-Link page. {normalizeMultiLinkButtonsForSetup(multiLinkButtons).buttons.length ? "Your draft links will be saved to the page." : "You skipped links for now and can add them from your account after payment."}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-ink">Standard Direct confirmation</p>
                        <p>The NFC tap opens the destination link above. No Tap Rater account, hosted page, or activation is required.</p>
                      </>
                    )}
                  </div>
                </div>
              ) : null}

              {step === "confirmation" && selectedOption.id === "branded_qr_direct" ? (
                <div className="grid gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">Approve your stand</p>
                    <p className="mt-1 text-sm leading-6 text-muted">{businessName} · Qty {selectedQuantity} · {configuredUnitPriceCents === null ? "Price pending" : formatPrice(standQuote?.subtotalCents ?? configuredUnitPriceCents * selectedQuantity)}</p>
                  </div>
                  <div className="grid min-w-0 gap-5 md:grid-cols-2">
                    <BrandedProofPreview productSlug={product.slug} setup={proofSetup} onReady={setReadyProof} />
                    {logo ? <ProofControls
                      logo={logo} logoBackgroundMode={logoBackgroundMode} logoFitMode={logoFitMode}
                      logoOffsetXPercent={logoOffsetXPercent} logoOffsetYPercent={logoOffsetYPercent}
                      proofFontSizePercent={proofFontSizePercent} proofLogoSizePercent={proofLogoSizePercent}
                      onLogoBackgroundModeChange={setLogoBackgroundMode} onLogoFitModeChange={setLogoFitMode}
                      onLogoOffsetXPercentChange={setLogoOffsetXPercent} onLogoOffsetYPercentChange={setLogoOffsetYPercent}
                      onProofFontSizePercentChange={setProofFontSizePercent} onProofLogoSizePercentChange={setProofLogoSizePercent}
                      showBusinessNameOnProof={showBusinessNameOnProof} onShowBusinessNameOnProofChange={setShowBusinessNameOnProof}
                      isUploadingLogo={isUploadingLogo} onUploadLogo={(file) => uploadLogo(file)}
                    /> : null}
                  </div>
                  <p className="text-sm text-muted [overflow-wrap:anywhere]">QR destination: {proofQrValue}</p>
                  <label className="flex items-start gap-3 border-t border-line py-4 text-sm font-semibold text-ink">
                    <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-brand" disabled={!proofIsReady}
                      checked={proofIsApproved} onChange={(event) => setApprovedProofId(event.target.checked ? readyProof?.proofReceiptId ?? "" : "")} />
                    I approve this artwork, business name, and QR destination for printing.
                  </label>
                </div>
              ) : null}
            </div>

            <div className="border-t border-line bg-white px-4 py-4 sm:px-6">
              {error ? <p className="tr-status-error mb-3" role="alert">{error}</p> : null}
              <div className="flex items-center justify-between gap-3">
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
                  <button type="button" className="tr-button-primary" disabled={isReservingDestination} onClick={continueFromDestination}>
                    {isReservingDestination ? "Reserving destination..." : selectedLinkExperience === "multilink" && selectedOption.hasQr && !hostedReservation ? "Generate page QR" : selectedLinkExperience === "multilink" ? "Continue to links" : selectedOption.id === "branded_qr_direct" ? "Continue to logo" : "Review setup"}
                  </button>
                ) : null}
                {step === "links" ? (
                  <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <button type="button" className="tr-button-outline" onClick={() => continueFromMultiLinkLinks({ skip: true })}>
                      Skip for later
                    </button>
                    <button type="button" className="tr-button-primary" onClick={() => continueFromMultiLinkLinks()}>
                      {selectedOption.id === "branded_qr_direct" ? "Continue to logo" : "Review setup"}
                    </button>
                  </div>
                ) : null}
                {step === "design" && selectedOption.id === "branded_qr_direct" ? (
                  <button type="button" className="tr-button-primary" onClick={continueFromDesign}>
                    Preview stand
                  </button>
                ) : null}
                {step === "review" && selectedOption.id !== "branded_qr_direct" ? (
                  <button type="button" className="tr-button-primary" onClick={addConfiguredItemToCart}>
                    Add to cart
                  </button>
                ) : null}
                {step === "confirmation" ? (
                  <button type="button" className="tr-button-primary" disabled={!proofIsApproved} onClick={addConfiguredItemToCart}>
                    Add to cart
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </ModalDialog>
      ) : null}
    </>
  );
}

function BuilderSummary({
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

function MultiLinkSetupStep({
  businessName,
  buttons,
  onButtonsChange
}: {
  businessName: string;
  buttons: MultiLinkDraftButton[];
  onButtonsChange: (buttons: MultiLinkDraftButton[]) => void;
}) {
  const previewButtons = buttons
    .map((button, index) => ({
      ...button,
      label: button.label.trim() || getHostedButtonLabel(button.type),
      position: index
    }))
    .filter((button) => button.label || button.url.trim());

  function updateButton(id: string, patch: Partial<MultiLinkDraftButton>) {
    onButtonsChange(buttons.map((button) => (button.id === id ? { ...button, ...patch } : button)));
  }

  function addButton() {
    if (buttons.length >= hostedPageButtonLimit) return;
    const nextType = supportedHostedPageButtons.find((item) => !buttons.some((button) => button.type === item.type))?.type ?? "custom_link";
    onButtonsChange([
      ...buttons,
      {
        id: createMultiLinkButtonId(),
        type: nextType,
        label: getHostedButtonLabel(nextType),
        url: "",
        enabled: true,
        position: buttons.length
      }
    ]);
  }

  function removeButton(id: string) {
    onButtonsChange(buttons.filter((button) => button.id !== id).map((button, index) => ({ ...button, position: index })));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
      <div className="grid gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">Multi-Link page links</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Add the first links now to preview the customer page, or skip and finish them from your account after payment.
          </p>
        </div>

        <div className="grid gap-3">
          {buttons.map((button, index) => (
            <div key={button.id} className="grid gap-3 rounded-lg border border-line bg-white p-3 sm:grid-cols-[150px_minmax(0,1fr)_minmax(0,1.5fr)_auto] sm:items-end">
              <label className="grid gap-2 text-sm font-semibold text-ink">
                Icon
                <select
                  className="tr-input"
                  value={button.type}
                  onChange={(event) => {
                    const type = event.target.value as HostedPageEditorButtonType;
                    const previousDefaultLabel = getHostedButtonLabel(button.type);
                    updateButton(button.id, { type, label: !button.label.trim() || button.label.trim() === previousDefaultLabel ? getHostedButtonLabel(type) : button.label });
                  }}
                  aria-label={`Choose icon for link ${index + 1}`}
                >
                  {supportedHostedPageButtons.map((option) => (
                    <option key={option.type} value={option.type}>{getHostedButtonSymbol(option.type)} {option.label}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-ink">
                Button label
                <input
                  className="tr-input"
                  value={button.label}
                  onChange={(event) => updateButton(button.id, { label: event.target.value })}
                  placeholder={getHostedButtonLabel(button.type)}
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-ink">
                Link URL
                <input
                  className="tr-input"
                  type="url"
                  value={button.url}
                  onChange={(event) => updateButton(button.id, { url: event.target.value })}
                  placeholder="https://example.com"
                />
              </label>

              <button type="button" className="tr-icon-button" onClick={() => removeButton(button.id)} aria-label={`Remove link ${index + 1}`}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <button type="button" className="tr-button-outline w-full sm:w-fit" onClick={addButton} disabled={buttons.length >= hostedPageButtonLimit}>
          <Plus size={16} />
          Add link
        </button>
      </div>

      <MultiLinkMobilePreview businessName={businessName} buttons={previewButtons} />
    </div>
  );
}

function MultiLinkMobilePreview({ businessName, buttons }: { businessName: string; buttons: MultiLinkDraftButton[] }) {
  return (
    <div className="rounded-2xl border border-line bg-ink p-2 shadow-sm lg:sticky lg:top-4">
      <div className="min-h-[520px] rounded-xl bg-white p-4">
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-line" aria-hidden="true" />
        <div className="grid justify-items-center gap-2 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand/10 text-xl font-black text-brand">
            {(businessName.trim()[0] ?? "T").toUpperCase()}
          </span>
          <p className="text-lg font-black leading-6 text-ink">{businessName.trim() || "Your business"}</p>
          <p className="max-w-[190px] text-sm leading-6 text-muted">Choose the link you need below.</p>
        </div>

        <div className="mt-6 grid gap-2">
          {buttons.length ? (
            buttons.map((button) => (
              <div key={button.id} className="flex min-h-14 items-center gap-3 rounded-lg border border-line bg-white px-3 py-2 text-left shadow-sm">
                <MultiLinkButtonMark type={button.type} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-ink">{button.label}</span>
                  <span className="block truncate text-xs font-semibold text-muted">{formatPreviewUrl(button.url) || "Link to be added"}</span>
                </span>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-line bg-soft p-4 text-center text-sm leading-6 text-muted">
              Links can be added after checkout.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MultiLinkButtonMark({ type }: { type: HostedPageEditorButtonType }) {
  const mark = getHostedButtonMark(type);
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xs font-medium"
      style={{ backgroundColor: mark.background, borderColor: mark.border, color: mark.color }}
      aria-label={mark.brand}
    >
      {mark.text}
    </span>
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

function getOptionSummary(option: PurchaseOption) {
  if (option.id === "hosted_multilink") {
    return "Hosted page with up to 10 links";
  }

  if (option.id === "branded_qr_direct") {
    return "Preview and approve before payment";
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

function createInitialMultiLinkButtons(): MultiLinkDraftButton[] {
  return [
    createMultiLinkButton("website", 0),
    createMultiLinkButton("google_review", 1),
    createMultiLinkButton("instagram", 2)
  ];
}

function createMultiLinkButton(type: HostedPageEditorButtonType, position: number): MultiLinkDraftButton {
  return {
    id: createMultiLinkButtonId(),
    type,
    label: getHostedButtonLabel(type),
    url: "",
    enabled: true,
    position
  };
}

function createMultiLinkButtonId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `link-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getHostedButtonLabel(type: HostedPageEditorButtonType) {
  return supportedHostedPageButtons.find((button) => button.type === type)?.label ?? "Custom Link";
}

function getHostedButtonSymbol(type: HostedPageEditorButtonType) {
  return getHostedButtonMark(type).text;
}

function formatPreviewUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return trimmed;
  }
}

function normalizeMultiLinkButtonsForSetup(buttons: MultiLinkDraftButton[]): { buttons: MultiLinkDraftButton[]; error?: string } {
  const normalized: MultiLinkDraftButton[] = [];

  for (const [index, button] of buttons.entries()) {
    const label = button.label.trim();
    const url = button.url.trim();

    if (!label && !url) continue;
    if (!label || !url) {
      return { buttons: [], error: `Complete or remove Multi-Link row ${index + 1}.` };
    }
    if (!isHttpUrl(url)) {
      return { buttons: [], error: `Enter a valid URL for Multi-Link row ${index + 1}.` };
    }

    normalized.push({
      id: button.id,
      type: button.type,
      label,
      url,
      enabled: true,
      position: normalized.length
    });
  }

  return { buttons: normalized.slice(0, hostedPageButtonLimit) };
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
