import { normalizeGoogleReviewLink } from "@/lib/google-review";

export const reviewLinkDraftKey = "taprater:review-link-draft:v1";
export function parseReviewLinkDraft(raw: string | null, now = Date.now()): string | undefined {
  try {
    const draft = JSON.parse(raw ?? "null");
    if (!draft || typeof draft.createdAt !== "number" || typeof draft.url !== "string"
      || draft.createdAt > now || now - draft.createdAt > 30 * 60 * 1000) return undefined;
    return normalizeGoogleReviewLink(draft.url);
  } catch { return undefined; }
}

export function readReviewLinkDraft(raw: string | null, now = Date.now()) {
  const url = parseReviewLinkDraft(raw, now);
  if (!url) return undefined;
  const draft = JSON.parse(raw!);
  return { url, businessName: typeof draft.businessName === "string" ? draft.businessName.trim().slice(0, 200) : "" };
}
