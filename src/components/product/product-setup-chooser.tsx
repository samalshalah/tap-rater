"use client";

import type { ProductSetupChooserProps, SetupStep } from "./product-setup-chooser-types";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { maxCartItemQuantity } from "@/lib/cart";
import { freeShippingCountries,quoteOffers } from "@/lib/offers";
import { formatPrice } from "@/lib/products";
import { Minus, Plus, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { hostedMultiLinkServiceAddon } from "@/lib/service-addons";
import { ProductSetupOptions } from "./product-setup-options";
import { useProductSetupState } from "./use-product-setup-state";
import { createProductSetupActions } from "./product-setup-actions";
export type { ProductSetupChooserProduct } from "./product-setup-chooser-types";

const ProductSetupDialogContent = dynamic(() => import('./product-setup-dialog-content').then(m => m.ProductSetupDialogContent), {
  loading: () => <p role="status" className="p-6 text-sm text-muted">Loading setup controls...</p>,
});

export function ProductSetupChooser(props: ProductSetupChooserProps) {
  const state = useProductSetupState(props);
  const {
    product,
    offers,
    shipping,
    fixedSelection,
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
    readyProof,
    setReadyProof,
    setApprovedProofId,
    hostedReservation,
    isReservingDestination,
    error,
    setError,
    isBuilderOpen,
    builderContentRef,
    builderHeadingRef,
    builderHeadingId,
    selectedOption,
    selectedOptionId,
    supportsMultiLink,
    hostedPurchasingEnabled,
    activeSizes,
    selectedSize,
    activeColors,
    selectedColor,
    configuredUnitPriceCents,
    isGoogleReviewProduct,
    googleSearchQuery,
    setGoogleSearchQuery,
    googleAutocompleteStatus,
    googleSearchResults,
    selectedImage,
    setupOptions,
    proofQrValue,
    quantityEnabled,
    selectedQuantity,
    proofSetup,
    proofIsReady,
    proofIsApproved
  } = state;
  const { chooseOption, setClampedQuantity, updateQuantityFromInput, openBuilder, closeBuilder, useGooglePlace, continueFromDestination, continueFromMultiLinkLinks, uploadLogo, continueFromDesign, goToPreviousStep, addConfiguredItemToCart } = createProductSetupActions(state);

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

  const modalTitle =
    selectedLinkExperience === "multilink"
      ? "Set up your Multi-Link stand"
      : selectedOption.id === "branded_qr_direct"
        ? "Build your Branded QR stand"
        : "Set up your custom stand";

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
            {(!quantityEnabled || configuredUnitPriceCents === null || selectedQuantity > 1) ? <p className="text-xs font-semibold leading-5 text-muted">
              {quantityEnabled
                ? configuredUnitPriceCents === null
                  ? "Select an available size"
                  : `${selectedPrice} each`
                : "One Multi-Link page per setup"}
            </p> : null}
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
          {freeShippingCountries(offers).includes("US") ? "Free shipping on US orders. No minimum." : shipping.shippingMode === "free" ? "Free shipping on supported orders." : shipping.shippingMode === "manual" ? "Shipping is reviewed after the order." : `Shipping: ${formatPrice(shipping.flatShippingAmountCents)}.`}
          {!freeShippingCountries(offers).includes("US") && shipping.shippingMode === "flat" && offers?.shipping.enabled ? ` Free at ${formatPrice(offers.shipping.thresholdCents)} in merchandise after discounts (${offers.shipping.countryCodes.join(", ")}).` : ""}{" "}
          <Link href="/shipping" className="font-semibold text-brand underline">Delivery estimates</Link>
        </p> : null}
        <div className="tr-purchase-action" data-builder-open={isBuilderOpen}>
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
