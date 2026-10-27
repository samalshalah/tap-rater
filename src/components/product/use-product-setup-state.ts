"use client";

import type { LinkExperienceId, MultiLinkDraftButton, ProductSetupChooserProps, SetupStep } from "./product-setup-chooser-types";
import { createInitialMultiLinkButtons, getSelectedOptionImage, isGoogleReviewStand } from "./product-setup-model";
import { useCart } from "@/components/cart/cart-provider";
import type { ReadyBrandedProof } from "@/components/product/branded-proof-preview";
import { type CartItem } from "@/lib/cart";
import { getDefaultProductColor, getDefaultProductSize } from "@/lib/product-model";
import { getProductPurchaseOptions, isHostedPurchaseOptionEnabled, type PurchaseOptionId } from "@/lib/purchase-options";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { LogoBackgroundMode, LogoFitMode, UploadedLogo } from "./product-setup-types";
import { buildDirectProductionTargets } from "@/lib/direct-production";
import { readReviewLinkDraft, reviewLinkDraftKey } from "@/lib/review-link-draft";
import { hostedMultiLinkServiceAddon, productSupportsMultiLink } from "@/lib/service-addons";
import { useProductSetupVariants } from "./use-product-setup-variants";
import { useProductGoogleSearch } from "./use-product-google-search";

export function useProductSetupState({ product, offers, shipping, initialQuantity = 1, fixedSelection = false, onAdded, selectedOptionId: controlledSelectedOptionId, onSelectedOptionChange, onSelectedPriceChange, onSelectedMonthlyPriceChange }: ProductSetupChooserProps) {
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

  return {
    product,
    offers,
    shipping,
    fixedSelection,
    onAdded,
    onSelectedOptionChange,
    setUncontrolledSelectedOptionId,
    selectedLinkExperience,
    setSelectedLinkExperience,
    step,
    setStep,
    destinationUrl,
    setDestinationUrl,
    googlePlaceId,
    setGooglePlaceId,
    googlePlaceName,
    setGooglePlaceName,
    businessName,
    setBusinessName,
    multiLinkButtons,
    setMultiLinkButtons,
    logo,
    setLogo,
    quantity,
    setQuantity,
    setSelectedSizeCode,
    setSelectedColorCode,
    proofFontSizePercent,
    setProofFontSizePercent,
    proofLogoSizePercent,
    setProofLogoSizePercent,
    showBusinessNameOnProof,
    setShowBusinessNameOnProof,
    logoBackgroundMode,
    setLogoBackgroundMode,
    logoFitMode,
    setLogoFitMode,
    logoOffsetXPercent,
    setLogoOffsetXPercent,
    logoOffsetYPercent,
    setLogoOffsetYPercent,
    isUploadingLogo,
    setIsUploadingLogo,
    readyProof,
    setReadyProof,
    setApprovedProofId,
    hostedReservation,
    setHostedReservation,
    isReservingDestination,
    setIsReservingDestination,
    error,
    setError,
    isBuilderOpen,
    setIsBuilderOpen,
    builderContentRef,
    builderHeadingRef,
    builderHeadingId,
    cart,
    router,
    selectedOption,
    selectedOptionId,
    supportsMultiLink,
    hostedPurchasingEnabled,
    activeSizes,
    selectedSize,
    activeColors,
    selectedColor,
    configuredUnitPriceCents,
    finalSku,
    isGoogleReviewProduct,
    googleSearchQuery,
    setGoogleSearchQuery,
    googleAutocompleteStatus,
    setGoogleAutocompleteStatus,
    googleSearchResults,
    setGoogleSearchResults,
    selectedImage,
    proofFrontTemplateUrl,
    selectedLogoMediaUrl,
    selectedLogoStorageKey,
    setupOptions,
    generatedQrValue,
    proofQrValue,
    directTargets,
    quantityEnabled,
    selectedQuantity,
    proofSetup,
    proofIsReady,
    proofIsApproved
  };
}
