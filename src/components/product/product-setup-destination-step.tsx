"use client";

import { Search } from "lucide-react";
import dynamic from "next/dynamic";
import type { ProductSetupDialogProps } from "./product-setup-dialog-types";
import { isHttpUrl } from "./product-setup-model";
import { BuilderSummary } from "./product-setup-summary";

const QrPreview = dynamic(() => import("./qr-preview").then(m => m.QrPreview));

type DestinationStepProps = Pick<ProductSetupDialogProps,
  | "selectedLinkExperience"
  | "businessName"
  | "setBusinessName"
  | "selectedOption"
  | "isGoogleReviewProduct"
  | "googleSearchQuery"
  | "setGoogleSearchQuery"
  | "googlePlaceId"
  | "setGooglePlaceId"
  | "setGooglePlaceName"
  | "setDestinationUrl"
  | "googleAutocompleteStatus"
  | "googleSearchResults"
  | "useGooglePlace"
  | "destinationUrl"
  | "googlePlaceName"
  | "proofQrValue"
  | "selectedImage"
  | "product"
  | "selectedQuantity"
  | "standQuote"
  | "configuredUnitPriceCents"
>;

export function ProductSetupDestinationStep({
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
  configuredUnitPriceCents
}: DestinationStepProps) {
  return <div className="grid gap-4">
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
                </div>;
}
