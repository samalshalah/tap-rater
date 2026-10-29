"use client";

import { ExternalLink, Search } from "lucide-react";
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
                        {selectedOption.hasQr ? "QR and NFC will open your permanent Multi-Link page." : "NFC will open your Multi-Link page."}
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

                      {isGoogleReviewProduct ? (
                        <details className="text-xs text-muted">
                          <summary className="w-fit cursor-pointer py-2 font-semibold text-brand">Use a manual review link</summary>
                          <label className="mt-2 grid gap-2 text-sm font-semibold text-ink">
                            Manual Google review link
                            <input className="tr-input" type="url" value={destinationUrl}
                              onChange={(event) => {
                                setDestinationUrl(event.target.value);
                                setGooglePlaceId("");
                                setGooglePlaceName("");
                              }}
                              placeholder="https://search.google.com/local/writereview?placeid=..."
                            />
                          </label>
                        </details>
                      ) : (
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
                      )}
                    </>
                  )}
                  {selectedOption.hasQr && isHttpUrl(proofQrValue) ? (
                    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_6rem] items-center gap-4 border-t border-line pt-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{googlePlaceName || (isGoogleReviewProduct ? "Check your review link" : "Check your link")}</p>
                        <p className="mt-1 text-xs leading-5 text-muted">Open the link or scan the QR to confirm.</p>
                        <a href={proofQrValue} target="_blank" rel="noopener noreferrer" aria-label="Check link (opens in a new tab)" className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-xs font-semibold text-brand transition hover:bg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                          Check link <ExternalLink size={14} aria-hidden="true" />
                        </a>
                      </div>
                      <div className="h-24 w-24 sm:h-28 sm:w-28"><QrPreview value={proofQrValue} variant="template" /></div>
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
