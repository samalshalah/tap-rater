import { describe, expect, it } from "vitest";
import { readGoogleAddressSuggestions, readGoogleShippingAddress } from "@/lib/shipping-address";

const component = (type: string, longText: string, shortText = longText) => ({ types: [type], longText, shortText });
const components = [
  component("street_number", "123"), component("route", "Main Street", "Main St"),
  component("locality", "Richmond"), component("administrative_area_level_1", "Virginia", "VA"),
  component("postal_code", "01234"), component("country", "United States", "US")
];

describe("shipping address component mapping", () => {
  it("fills US shipping fields from structured components, preserving leading ZIP zeros", () => {
    expect(readGoogleShippingAddress({ addressComponents: components })).toEqual({
      line1: "123 Main St", line2: "", city: "Richmond", state: "VA", postalCode: "01234", country: "US"
    });
  });
  it("supports ZIP+4 and units", () => {
    expect(readGoogleShippingAddress({ addressComponents: [...components, component("postal_code_suffix", "0001"), component("subpremise", "2B")] }))
      .toMatchObject({ postalCode: "01234-0001", line2: "Unit 2B" });
  });
  it.each(["postal_town", "sublocality_level_1", "sublocality"])("falls back to %s when locality is missing", (type) => {
    const addressComponents = components.filter((entry) => !entry.types.includes("locality"));
    expect(readGoogleShippingAddress({ addressComponents: [...addressComponents, component(type, "Brooklyn")] })?.city).toBe("Brooklyn");
  });
  it("leaves missing city and ZIP empty for manual completion, never inventing them", () => {
    expect(readGoogleShippingAddress({ addressComponents: components.filter((entry) => !["locality", "postal_code"].includes(entry.types[0])) }))
      .toMatchObject({ city: "", postalCode: "" });
  });
  it.each(["country", "street_number", "route", "administrative_area_level_1"])("rejects incomplete addresses without %s", (type) => {
    expect(readGoogleShippingAddress({ addressComponents: components.filter((entry) => !entry.types.includes(type)) })).toBeNull();
  });
  it("rejects foreign countries and unknown states", () => {
    for (const [type, replacement] of [["country", "CA"], ["administrative_area_level_1", "ZZ"]]) {
      const addressComponents = components.map((entry) => entry.types.includes(type) ? component(type, replacement) : entry);
      expect(readGoogleShippingAddress({ addressComponents })).toBeNull();
    }
  });
  it("handles malformed provider data", () => {
    expect(readGoogleShippingAddress({ error: "unavailable" })).toBeNull();
    expect(readGoogleAddressSuggestions(null)).toEqual([]);
    expect(readGoogleAddressSuggestions({})).toEqual([]);
  });
  it("returns at most five place predictions, not query suggestions", () => {
    const suggestions = Array.from({ length: 7 }, (_, index) => ({ placePrediction: { placeId: `place_${index}`, text: { text: `${index} Main St` } } }));
    expect(readGoogleAddressSuggestions({ suggestions: [{ queryPrediction: {} }, ...suggestions] })).toEqual(
      Array.from({ length: 5 }, (_, index) => ({ placeId: `place_${index}`, label: `${index} Main St` }))
    );
  });
});
