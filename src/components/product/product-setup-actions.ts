"use client";

import type { ProductSetupChooserProps } from "./product-setup-chooser-types";
import { isHttpUrl, normalizeMultiLinkButtonsForSetup } from "./product-setup-model";
import { maxCartItemQuantity, type CartItem } from "@/lib/cart";
import { getProductBaseSku } from "@/lib/product-model";
import { type PurchaseOptionId } from "@/lib/purchase-options";
import { QR_CODE_ERROR_MESSAGE } from "@/lib/qr-code-message";
import { type GoogleBusinessSelection } from "@/lib/google-places-client";
import { hostedMultiLinkServiceAddon } from "@/lib/service-addons";
import type { useProductSetupState } from "./use-product-setup-state";

export function createProductSetupActions({
  product,
  onAdded,
  onSelectedOptionChange,
  setUncontrolledSelectedOptionId,
  selectedLinkExperience,
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
  proofFontSizePercent,
  proofLogoSizePercent,
  setProofLogoSizePercent,
  showBusinessNameOnProof,
  logoBackgroundMode,
  setLogoBackgroundMode,
  logoFitMode,
  setLogoFitMode,
  logoOffsetXPercent,
  setLogoOffsetXPercent,
  logoOffsetYPercent,
  setLogoOffsetYPercent,
  setIsUploadingLogo,
  readyProof,
  hostedReservation,
  setHostedReservation,
  setIsReservingDestination,
  error,
  setError,
  setIsBuilderOpen,
  cart,
  router,
  selectedOption,
  hostedPurchasingEnabled,
  selectedSize,
  selectedColor,
  configuredUnitPriceCents,
  finalSku,
  setGoogleSearchQuery,
  setGoogleAutocompleteStatus,
  setGoogleSearchResults,
  proofFrontTemplateUrl,
  selectedLogoMediaUrl,
  selectedLogoStorageKey,
  generatedQrValue,
  proofQrValue,
  directTargets,
  selectedQuantity,
  proofIsApproved
}: ReturnType<typeof useProductSetupState>) {
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

  return { chooseOption, setClampedQuantity, updateQuantityFromInput, openBuilder, closeBuilder, useGooglePlace, continueFromDestination, continueFromMultiLinkLinks, uploadLogo, continueFromDesign, continueFromProof, goToPreviousStep, addConfiguredItemToCart };
}
