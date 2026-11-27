import { internalAnalyticsCookie } from "@/lib/analytics-attribution";
import { readConsent, type ConsentChoice } from "@/lib/storefront-analytics";

// Separate from existing analytics and Meta choices: neither grants Google Ads consent.
export const googleAdsConsentKey = "taprater:google-ads-consent:v1";
let denied = false;
export function googleAdsConsent(): ConsentChoice | null {
  try {
    if (denied || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl ||
      document.cookie.split(";").some(v => v.trim() === `${internalAnalyticsCookie}=1`)) return "denied";
    return readConsent(localStorage.getItem(googleAdsConsentKey));
  } catch { return null; }
}
export function saveGoogleAdsConsent(choice: ConsentChoice) {
  denied = true;
  try {
    localStorage.setItem(googleAdsConsentKey, JSON.stringify({ version: 1, choice, savedAt: Date.now() }));
    denied = choice === "denied";
    return true;
  } catch { return false; }
}

// Only Google click parameters, never arbitrary form/query data. No custom storage.
export function googleClickQuery(search: string) {
  const source = new URLSearchParams(search), result = new URLSearchParams();
  for (const key of ["gclid", "gbraid", "wbraid"]) {
    const value = source.get(key);
    if (value && /^[A-Za-z0-9_-]{6,512}$/.test(value)) result.set(key, value);
  }
  return result.toString();
}
