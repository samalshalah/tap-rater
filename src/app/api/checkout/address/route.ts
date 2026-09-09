import { z } from "zod";
import { readRequestTextWithLimit, RequestBodyTooLargeError } from "@/lib/http-request";
import { checkPublicRateLimit } from "@/lib/public-rate-limit";
import { readGoogleAddressSuggestions, readGoogleShippingAddress } from "@/lib/shipping-address";

export const dynamic = "force-dynamic";

const sessionToken = z.string().uuid();
const lookupSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("suggest"), query: z.string().trim().min(3).max(160), sessionToken }).strict(),
  z.object({ action: z.literal("select"), placeId: z.string().min(1).max(256).regex(/^[A-Za-z0-9_-]+$/), sessionToken }).strict()
]);
const unavailable = "Address suggestions are unavailable. Enter your address manually.";

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", ...headers } });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return json({ error: "Invalid request origin." }, 403);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ error: "JSON is required." }, 415);
  }
  const rateLimit = await checkPublicRateLimit(request, "checkout-address", "PUBLIC_EVENT_RATE_LIMITER");
  if (rateLimit.limited) return json({ error: unavailable }, 429, { "Retry-After": "60" });

  let input: z.infer<typeof lookupSchema>;
  try {
    input = lookupSchema.parse(JSON.parse(await readRequestTextWithLimit(request, 2048)));
  } catch (error) {
    return json({ error: "Invalid address lookup." }, error instanceof RequestBodyTooLargeError ? 413 : 400);
  }
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_PLATFORM_API_KEY || process.env.MAPS_PLATFORM_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return json({ error: unavailable }, 503);

  try {
    const headers = { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey };
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(5000)]);
    const url = new URL(`https://places.googleapis.com/v1/places/${input.action === "select" ? encodeURIComponent(input.placeId) : ""}`);
    if (input.action === "select") {
      url.searchParams.set("sessionToken", input.sessionToken);
      url.searchParams.set("languageCode", "en");
    }
    const response = input.action === "suggest"
      ? await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST", cache: "no-store", signal,
        headers: { ...headers, "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text" },
        body: JSON.stringify({ input: input.query, includedRegionCodes: ["us"], regionCode: "us", languageCode: "en", sessionToken: input.sessionToken })
      })
      : await fetch(url, { cache: "no-store", signal, headers: { ...headers, "X-Goog-FieldMask": "addressComponents" } });
    if (!response.ok) {
      // Do not log address queries, provider bodies, or credentials.
      console.warn("Address lookup provider unavailable", { action: input.action, status: response.status });
      return json({ error: unavailable }, 503);
    }
    const payload: unknown = await response.json();
    if (input.action === "suggest") return json({ suggestions: readGoogleAddressSuggestions(payload) });
    const address = readGoogleShippingAddress(payload);
    return address ? json({ address }) : json({ error: "A complete street address was not found. Enter your address manually." }, 422);
  } catch {
    return json({ error: unavailable }, 503);
  }
}
