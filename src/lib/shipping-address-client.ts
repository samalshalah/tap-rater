import type { AddressSuggestion, SuggestedShippingAddress } from "@/lib/shipping-address";

async function lookup<T>(input: Record<string, string>, signal: AbortSignal): Promise<T> {
  const response = await fetch("/api/checkout/address", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input), cache: "no-store", signal
  });
  if (!response.ok) throw new Error("Address lookup unavailable.");
  return response.json() as Promise<T>;
}

export function suggestShippingAddresses(query: string, sessionToken: string, signal: AbortSignal) {
  return lookup<{ suggestions: AddressSuggestion[] }>({ action: "suggest", query, sessionToken }, signal);
}

export function selectShippingAddress(placeId: string, sessionToken: string, signal: AbortSignal) {
  return lookup<{ address: SuggestedShippingAddress }>({ action: "select", placeId, sessionToken }, signal);
}
