"use client";

import { useEffect, useState } from "react";
import type { GoogleBusinessSelection } from "@/lib/google-places-client";
import { startProductGoogleSearch, type GoogleAutocompleteStatus } from "@/lib/product-google-search";

export function useProductGoogleSearch(enabled: boolean, selectedPlaceId: string) {
  const [googleSearchQuery, setGoogleSearchQuery] = useState("");
  const [googleAutocompleteStatus, setGoogleAutocompleteStatus] = useState<GoogleAutocompleteStatus>("idle");
  const [googleSearchResults, setGoogleSearchResults] = useState<GoogleBusinessSelection[]>([]);
  useEffect(() => startProductGoogleSearch({
    enabled, query: googleSearchQuery, selectedPlaceId,
    onStatus: setGoogleAutocompleteStatus, onResults: setGoogleSearchResults
  }), [enabled, googleSearchQuery, selectedPlaceId]);
  return { googleSearchQuery, setGoogleSearchQuery, googleAutocompleteStatus, setGoogleAutocompleteStatus, googleSearchResults, setGoogleSearchResults };
}
