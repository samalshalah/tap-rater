"use client";
import type { LinkExperienceId,MultiLinkDraftButton,ProductSetupChooserProps,SetupStep } from "./product-setup-chooser-types";
import { createInitialMultiLinkButtons,getSelectedOptionImage,isGoogleReviewStand,isHttpUrl,normalizeMultiLinkButtonsForSetup } from "./product-setup-model";
export type { ProductSetupChooserProduct } from "./product-setup-chooser-types";

import { useCart } from "@/components/cart/cart-provider";
import type { ReadyBrandedProof } from "@/components/product/branded-proof-preview";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { maxCartItemQuantity,type CartItem } from "@/lib/cart";
import { quoteOffers } from "@/lib/offers";
import {getDefaultProductColor,getDefaultProductSize,getProductBaseSku } from "@/lib/product-model";
import { formatPrice } from "@/lib/products";
import { getProductPurchaseOptions,isHostedPurchaseOptionEnabled,type PurchaseOptionId } from "@/lib/purchase-options";
import { QR_CODE_ERROR_MESSAGE } from "@/lib/qr-code-message";
import { Minus,Plus,X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect,useId,useMemo,useRef,useState } from "react";
import type { LogoBackgroundMode,LogoFitMode,UploadedLogo } from "./product-setup-types";

import { buildDirectProductionTargets } from "@/lib/direct-production";
import {type GoogleBusinessSelection } from "@/lib/google-places-client";
import { readReviewLinkDraft,reviewLinkDraftKey } from "@/lib/review-link-draft";
import { hostedMultiLinkServiceAddon,productSupportsMultiLink } from "@/lib/service-addons";

import {ProductSetupOptions} from "./product-setup-options";
import {useProductSetupVariants} from "./use-product-setup-variants";
import {useProductGoogleSearch} from "./use-product-google-search";

const ProductSetupDialogContent = dynamic(() => import('./product-setup-dialog-content').then(m => m.ProductSetupDialogContent), {
  loading: () => <p role="status" className="p-6 text-sm text-muted">Loading setup controls...</p>,
});

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
  const {activeSizes,selectedSize,activeColors,selectedColor,configuredUnitPriceCents,finalSku}=useProductSetupVariants(product,selectedOption,selectedSizeCode,selectedColorCode);
  const isGoogleReviewProduct = isGoogleReviewStand(product);
  const {googleSearchQuery,setGoogleSearchQuery,googleAutocompleteStatus,setGoogleAutocompleteStatus,googleSearchResults,setGoogleSearchResults}=useProductGoogleSearch(isBuilderOpen && isGoogleReviewProduct && step === "destination",googlePlaceId);
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
    if (!selectedSize || selectedSize.code === selectedSizeCode) return;
    setSelectedSizeCode(selectedSize.code);
  }, [selectedSize, selectedSizeCode]);

  useEffect(() => {
    onSelectedPriceChange?.(configuredUnitPriceCents);
  }, [configuredUnitPriceCents, onSelectedPriceChange]);

  useEffect(() => {
    onSelectedMonthlyPriceChange?.(selectedLinkExperience === "multilink" ? hostedMultiLinkServiceAddon.monthlyPriceCents : 0);
  }, [selectedLinkExperience, onSelectedMonthlyPriceChange]);



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
        <ProductSetupOptions product={product} setupOptions={setupOptions} selectedOptionId={selectedOptionId} chooseOption={chooseOption} offers={offers} activeSizes={activeSizes} selectedSize={selectedSize} setSelectedSizeCode={setSelectedSizeCode} activeColors={activeColors} selectedColor={selectedColor} setSelectedColorCode={setSelectedColorCode}/>

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

            <ProductSetupDialogContent
              stepGridClassName={stepGridClassName}
              stepLabels={stepLabels}
              activeStepIndex={activeStepIndex}
              stepOrder={stepOrder}
              setStep={setStep}
              builderContentRef={builderContentRef}
              step={step}
              goToPreviousStep={goToPreviousStep}
              selectedLinkExperience={selectedLinkExperience}
              businessName={businessName}
              setBusinessName={setBusinessName}
              selectedOption={selectedOption}
              isGoogleReviewProduct={isGoogleReviewProduct}
              googleSearchQuery={googleSearchQuery}
              setGoogleSearchQuery={setGoogleSearchQuery}
              googlePlaceId={googlePlaceId}
              setGooglePlaceId={setGooglePlaceId}
              setGooglePlaceName={setGooglePlaceName}
              setDestinationUrl={setDestinationUrl}
              googleAutocompleteStatus={googleAutocompleteStatus}
              googleSearchResults={googleSearchResults}
              useGooglePlace={useGooglePlace}
              destinationUrl={destinationUrl}
              googlePlaceName={googlePlaceName}
              proofQrValue={proofQrValue}
              selectedImage={selectedImage}
              product={product}
              selectedQuantity={selectedQuantity}
              standQuote={standQuote}
              configuredUnitPriceCents={configuredUnitPriceCents}
              multiLinkButtons={multiLinkButtons}
              setMultiLinkButtons={setMultiLinkButtons}
              logo={logo}
              isUploadingLogo={isUploadingLogo}
              uploadLogo={uploadLogo}
              selectedSize={selectedSize}
              selectedColor={selectedColor}
              proofSetup={proofSetup}
              setReadyProof={setReadyProof}
              logoBackgroundMode={logoBackgroundMode}
              logoFitMode={logoFitMode}
              logoOffsetXPercent={logoOffsetXPercent}
              logoOffsetYPercent={logoOffsetYPercent}
              proofFontSizePercent={proofFontSizePercent}
              proofLogoSizePercent={proofLogoSizePercent}
              setLogoBackgroundMode={setLogoBackgroundMode}
              setLogoFitMode={setLogoFitMode}
              setLogoOffsetXPercent={setLogoOffsetXPercent}
              setLogoOffsetYPercent={setLogoOffsetYPercent}
              setProofFontSizePercent={setProofFontSizePercent}
              setProofLogoSizePercent={setProofLogoSizePercent}
              showBusinessNameOnProof={showBusinessNameOnProof}
              setShowBusinessNameOnProof={setShowBusinessNameOnProof}
              proofIsReady={proofIsReady}
              proofIsApproved={proofIsApproved}
              setApprovedProofId={setApprovedProofId}
              readyProof={readyProof}
              error={error}
              closeBuilder={closeBuilder}
              isReservingDestination={isReservingDestination}
              continueFromDestination={continueFromDestination}
              hostedReservation={hostedReservation}
              continueFromMultiLinkLinks={continueFromMultiLinkLinks}
              continueFromDesign={continueFromDesign}
              addConfiguredItemToCart={addConfiguredItemToCart}
              builderHeadingRef={builderHeadingRef}
            />
          </div>
        </ModalDialog>
      ) : null}
    </>
  );
}
