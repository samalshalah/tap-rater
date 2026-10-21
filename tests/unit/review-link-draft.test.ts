import { describe, expect, it } from "vitest";
import { parseReviewLinkDraft, readReviewLinkDraft } from "@/lib/review-link-draft";

describe("review link draft", () => {
  const now = 2_000_000;
  const url = "https://search.google.com/local/writereview?placeid=ChIJtest";
  it("keeps a recent valid Google review destination", () => {
    expect(parseReviewLinkDraft(JSON.stringify({ url, createdAt: now - 1000 }), now)).toBe(url);
  });
  it.each([null, "bad", "{}", JSON.stringify({ url, createdAt: 0 }), JSON.stringify({ url, createdAt: now + 1 }), JSON.stringify({ url: "https://evil.example", createdAt: now })])("rejects malformed, expired, future or untrusted drafts", (raw) => {
    expect(parseReviewLinkDraft(raw, now)).toBeUndefined();
  });
});

describe("generator handoff", () => {
  const now = 2000000;
  const url = "https://search.google.com/local/writereview?placeid=ChIJtest";
  it("carries a business name with a validated link", () => {
    expect(readReviewLinkDraft(JSON.stringify({url, businessName: " Example Cafe ", createdAt: now}), now)).toEqual({url, businessName:"Example Cafe"});
  });
  it("does not carry business details from an expired or unsafe destination", () => {
    expect(readReviewLinkDraft(JSON.stringify({url, businessName:"Example", createdAt:0}), now)).toBeUndefined();
    expect(readReviewLinkDraft(JSON.stringify({url:"javascript:alert(1)", businessName:"Example", createdAt:now}), now)).toBeUndefined();
  });
  it("supports old URL-only drafts and ignores non-text business names", () => {
    expect(readReviewLinkDraft(JSON.stringify({url, createdAt:now}), now)).toEqual({url,businessName:""});
    expect(readReviewLinkDraft(JSON.stringify({url,businessName:{},createdAt:now}), now)).toEqual({url,businessName:""});
  });
});
