"use client";
import { formatPrice } from "@/lib/products";
import { StandLogoField } from "./stand-logo-field";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import type { ProductSetupDialogProps } from './product-setup-dialog-types';
import { normalizeMultiLinkButtonsForSetup } from "./product-setup-model";
import { ReviewLine } from "./product-setup-summary";
const MultiLinkSetupStep=dynamic(()=>import("./multilink-setup-step").then(m=>m.MultiLinkSetupStep),{loading:()=> <p role="status">Loading link editor...</p>});
const StandDesignEditor = dynamic(() => import("./stand-design-editor").then(m => m.StandDesignEditor));
import { ProductSetupDestinationStep } from "./product-setup-destination-step";
export function ProductSetupDialogContent({
  stepGridClassName,
  stepLabels,
  activeStepIndex,
  stepOrder,
  setStep,
  builderContentRef,
  step,
  goToPreviousStep,
  selectedLinkExperience,
  businessName,
  setBusinessName,
  selectedOption,
  isGoogleReviewProduct,
  googleSearchQuery,
  setGoogleSearchQuery,
  googlePlaceId,
  setGooglePlaceId,
  setGooglePlaceName,
  setDestinationUrl,
  googleAutocompleteStatus,
  googleSearchResults,
  useGooglePlace,
  destinationUrl,
  googlePlaceName,
  proofQrValue,
  selectedImage,
  product,
  selectedQuantity,
  standQuote,
  configuredUnitPriceCents,
  multiLinkButtons,
  setMultiLinkButtons,
  logo,
  isUploadingLogo,
  uploadLogo,
  selectedSize,
  selectedColor,
  proofSetup,
  setReadyProof,
  logoBackgroundMode,
  logoFitMode,
  logoOffsetXPercent,
  logoOffsetYPercent,
  proofFontSizePercent,
  proofLogoSizePercent,
  setLogoBackgroundMode,
  setLogoFitMode,
  setLogoOffsetXPercent,
  setLogoOffsetYPercent,
  setProofFontSizePercent,
  setProofLogoSizePercent,
  showBusinessNameOnProof,
  printBusinessName,
  setShowBusinessNameOnProof,
  proofIsReady,
  proofIsApproved,
  setApprovedProofId,
  readyProof,
  error,
  closeBuilder,
  isReservingDestination,
  continueFromDestination,
  hostedReservation,
  continueFromMultiLinkLinks,
  continueFromDesign,
  addConfiguredItemToCart,
  builderHeadingRef
}:ProductSetupDialogProps){
  useEffect(() => {
    if (!builderContentRef.current) return;
    builderContentRef.current.scrollTop = 0;
    builderHeadingRef.current?.focus({ preventScroll: true });
  }, [step, builderContentRef, builderHeadingRef]);
  return <><div className="border-b border-line px-4 py-3 sm:px-6">
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

              {step === "destination" ? <ProductSetupDestinationStep
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
                /> : null}

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
                    <p className="text-sm font-semibold text-ink">Stand design</p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      Upload your logo. You can also print your business name.
                    </p>
                  </div>

                  <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-ink">
                    <input type="checkbox" checked={printBusinessName} onChange={event => setShowBusinessNameOnProof(event.target.checked)} />
                    Add business name to stand
                  </label>
                  {printBusinessName && (selectedLinkExperience === "multilink" ? (
                    <p className="text-sm text-muted">{businessName}</p>
                  ) : (
                    <label className="grid gap-2 text-sm font-semibold text-ink">
                      Business name (optional)
                      <input className="tr-input" value={businessName}
                        onChange={event => setBusinessName(event.target.value)} placeholder="Your business name" />
                    </label>
                  ))}

                  <StandLogoField filename={logo?.filename} isUploadingLogo={isUploadingLogo} onUpload={uploadLogo} />

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
                        <p className="font-semibold text-ink">Stand setup confirmation</p>
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
                    <p className="mt-1 text-sm leading-6 text-muted">{showBusinessNameOnProof && `${businessName.trim()} · `}Qty {selectedQuantity} · {configuredUnitPriceCents === null ? "Price pending" : formatPrice(standQuote?.subtotalCents ?? configuredUnitPriceCents * selectedQuantity)}</p>
                  </div>
                  <StandDesignEditor productSlug={product.slug} setup={proofSetup} onReady={setReadyProof}
                    controls={{
                      canAutoCrop: Boolean(logo?.trimApplied), logoBackgroundMode, logoFitMode,
                      logoOffsetXPercent, logoOffsetYPercent, proofFontSizePercent, proofLogoSizePercent,
                      onLogoBackgroundModeChange: setLogoBackgroundMode, onLogoFitModeChange: setLogoFitMode,
                      onLogoOffsetXPercentChange: setLogoOffsetXPercent, onLogoOffsetYPercentChange: setLogoOffsetYPercent,
                      onProofFontSizePercentChange: setProofFontSizePercent, onProofLogoSizePercentChange: setProofLogoSizePercent,
                      showBusinessNameOnProof, isUploadingLogo, onUploadLogo: uploadLogo
                    }}
                  />
                  <p className="text-sm text-muted [overflow-wrap:anywhere]">QR destination: {proofQrValue}</p>
                  <label className="flex items-start gap-3 border-t border-line py-4 text-sm font-semibold text-ink">
                    <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-brand" disabled={!proofIsReady}
                      checked={proofIsApproved} onChange={(event) => setApprovedProofId(event.target.checked ? readyProof?.proofReceiptId ?? "" : "")} />
                    I approve this artwork and QR destination for printing.
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
            </div></>;
}
