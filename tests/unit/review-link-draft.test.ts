import { describe, expect, it } from "vitest";
import { parseReviewLinkDraft } from "@/lib/review-link-draft";

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
