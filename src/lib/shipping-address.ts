import { z } from "zod";
import { isUsStateCode } from "@/lib/us-states";

export type AddressSuggestion = { placeId: string; label: string };

export type SuggestedShippingAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: "US";
};

const componentSchema = z.object({
  longText: z.string().optional(),
  shortText: z.string().optional(),
  types: z.array(z.string())
});

export function readGoogleShippingAddress(payload: unknown): SuggestedShippingAddress | null {
  const parsed = z.object({ addressComponents: z.array(componentSchema) }).safeParse(payload);
  if (!parsed.success) return null;
  const components = parsed.data.addressComponents;
  const value = (type: string, short = false) => {
    const component = components.find((entry) => entry.types.includes(type));
    return (short ? component?.shortText : component?.longText)?.trim() ?? "";
  };
  const street = value("route", true) || value("route");
  const number = value("street_number");
  const state = value("administrative_area_level_1", true).toUpperCase();
  if (value("country", true) !== "US" || !number || !street || !isUsStateCode(state)) return null;
  const zip = value("postal_code");
  const suffix = value("postal_code_suffix");
  const unit = value("subpremise");
  return {
    line1: `${number} ${street}`,
    line2: unit ? `Unit ${unit}` : "",
    city: value("locality") || value("postal_town") || value("sublocality_level_1") || value("sublocality"),
    state,
    postalCode: /^\d{5}$/.test(zip) ? `${zip}${/^\d{4}$/.test(suffix) ? `-${suffix}` : ""}` : "",
    country: "US"
  };
}

export function readGoogleAddressSuggestions(payload: unknown): AddressSuggestion[] {
  const parsed = z.object({
    suggestions: z.array(z.object({
      placePrediction: z.object({ placeId: z.string(), text: z.object({ text: z.string() }) }).optional()
    })).default([])
  }).safeParse(payload);
  if (!parsed.success) return [];
  return parsed.data.suggestions.flatMap(({ placePrediction }) =>
    placePrediction?.placeId && placePrediction.text.text
      ? [{ placeId: placePrediction.placeId, label: placePrediction.text.text }]
      : []
  ).slice(0, 5);
}
