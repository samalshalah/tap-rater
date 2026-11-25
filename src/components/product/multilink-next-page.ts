"use client";

import type { CartItem } from "@/lib/cart";
import { createInitialMultiLinkButtons, defaultMultiLinkDescription } from "./product-setup-model";
import type { MultiLinkDraftButton } from "./product-setup-chooser-types";
import type { useProductSetupState } from "./use-product-setup-state";

type SetupState = ReturnType<typeof useProductSetupState>;

/** The Google place a Multi-Link setup's review link points at, if any. */
export function reviewPlaceId(buttons: { type?: string; url?: string }[] | undefined) {
  for (const button of buttons ?? []) {
    if (button.type !== "google_review" || !button.url) continue;
    try { return new URL(button.url).searchParams.get("placeid")?.trim() || undefined; } catch { /* not a link yet */ }
  }
  return undefined;
}

/** A Multi-Link page already in the cart for this Google location, so the customer adds stands instead. */
export function findPageInCart(items: CartItem[], placeId: string | undefined) {
  if (!placeId) return undefined;
  return items.find((item) => item.setup?.serviceAddon === "hosted_multilink" && reviewPlaceId(item.setup.multiLinkButtons) === placeId);
}

/** Links for the next page: the same links, without the Google review link (each location has its own). */
export function linksForNextPage(buttons: MultiLinkDraftButton[]) {
  return buttons.map((button) => (button.type === "google_review" ? { ...button, url: "" } : button));
}

/**
 * Starts the next Multi-Link page in the same dialog. Every page needs its own permanent code and its
 * own print approval (the QR differs), so the customer goes through the steps again, prefilled:
 * - "location": same business, another location. Keeps the logo, links, page text and print design;
 *   only the Google location changes.
 * - "business": a different business. Keeps the links as a starting point; everything else is fresh.
 */
export function startNextMultiLinkPage(state: SetupState, mode: "location" | "business") {
  const from = state.addedPage?.setup?.businessName ?? state.businessName;
  state.setBusinessName("");
  state.setGooglePlaceId("");
  state.setGooglePlaceName("");
  state.setHostedReservation(null);
  state.setReadyProof(null);
  state.setApprovedProofId("");
  state.setQuantity(1);
  state.setError("");
  state.setMultiLinkButtons((buttons) => {
    const next = linksForNextPage(buttons);
    return next.length ? next : createInitialMultiLinkButtons();
  });
  if (mode === "business") {
    state.setLogo(null);
    state.setMultiLinkTitle(state.product.displayText?.trim() ?? "");
    state.setMultiLinkDescription(defaultMultiLinkDescription);
    state.setMultiLinkShowBusinessName(true);
    state.setProofFontSizePercent(100);
    state.setProofLogoSizePercent(100);
    state.setShowBusinessNameOnProof(true);
    state.setLogoBackgroundMode("auto_crop");
    state.setLogoFitMode("contain");
    state.setLogoOffsetXPercent(0);
    state.setLogoOffsetYPercent(0);
  }
  state.setCopyNote(mode === "location"
    ? `Copied from ${from || "your last page"}: logo, links, page text and print design. Search the new location.`
    : `New business. Your links are copied as a starting point.`);
  state.setAddedPage(null);
  state.setStep("destination");
}
