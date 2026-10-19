import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { createGoogleBusinessClient } from "../../src/lib/google-business/client";
import { createGoogleOAuthRequest, matchesGoogleOAuthState, GOOGLE_BUSINESS_CALLBACK_PATH } from "../../src/lib/google-business/oauth";

describe("Google Business transport", () => {
  it("preserves pagination and sends bearer tokens only in headers", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ reviews: [{ reviewId: "r1", starRating: "FIVE" }], nextPageToken: "next", totalReviewCount: 51 }));
    const result = await createGoogleBusinessClient("private-token", fetcher).listReviews("accounts/1/locations/2", "a+b&c");
    const [url, options] = fetcher.mock.calls[0];
    expect(String(url)).not.toContain("private-token");
    expect(new URL(String(url)).searchParams.get("pageToken")).toBe("a+b&c");
    expect(new URL(String(url)).searchParams.get("pageSize")).toBe("50");
    expect(options).toMatchObject({ cache: "no-store", redirect: "error", headers: { Authorization: "Bearer private-token" } });
    expect(result.nextPageToken).toBe("next");
    expect(result.reviews[0].comment).toBeUndefined();
  });
  it("handles empty accounts and applies the locations read mask", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({}));
    const client = createGoogleBusinessClient("token", fetcher);
    expect(await client.listAccounts(undefined, "accounts/org")).toEqual({ accounts: [] });
    expect(new URL(String(fetcher.mock.calls[0][0])).searchParams.get("parentAccount")).toBe("accounts/org");
    expect(await client.listLocations("accounts/1")).toEqual({ locations: [] });
    expect(new URL(String(fetcher.mock.calls[1][0])).searchParams.get("readMask")).toBe("name,title");
  });
  it.each([[401, "reconnect"], [403, "access_denied"], [429, "quota"], [503, "unavailable"]])("classifies HTTP %s without exposing raw errors or retrying", async (status, code) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("secret internal error", { status: Number(status) }));
    await expect(createGoogleBusinessClient("token", fetcher).listAccounts()).rejects.toMatchObject({ code, status });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("rejects malformed responses and network failures", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ reviews: [{ starRating: "WRONG" }] })).mockRejectedValueOnce(new Error("secret"));
    const client = createGoogleBusinessClient("token", fetcher);
    await expect(client.listReviews("accounts/1/locations/2")).rejects.toMatchObject({ code: "invalid_response" });
    await expect(client.listAccounts()).rejects.toMatchObject({ code: "unavailable", message: "Google Business Profile is temporarily unavailable." });
  });
  it("blocks resource injection and invalid replies before network access", () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = createGoogleBusinessClient("token", fetcher);
    expect(() => client.listLocations("accounts/1/../../evil")).toThrow();
    expect(() => client.listReviews("accounts/1/locations/2?token=oops")).toThrow();
    expect(() => client.publishReply("accounts/1/locations/2/reviews/3", " ")).toThrow();
    expect(() => client.publishReply("accounts/1/locations/2/reviews/3", "a".repeat(4097))).toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("publishes an explicit reply to its exact resource", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ comment: "Thank you!" }));
    await createGoogleBusinessClient("token", fetcher).publishReply("accounts/1/locations/2/reviews/3", " Thank you! ");
    expect(String(fetcher.mock.calls[0][0])).toBe("https://mybusiness.googleapis.com/v4/accounts/1/locations/2/reviews/3/reply");
    expect(fetcher.mock.calls[0][1]).toMatchObject({ method: "PUT", body: '{"comment":"Thank you!"}' });
  });
});

describe("Google OAuth preparation", () => {
  const callback = `https://taprater.com${GOOGLE_BUSINESS_CALLBACK_PATH}`;
  it("uses unique state and PKCE with the business scope and offline access", () => {
    const first = createGoogleOAuthRequest("123.apps.googleusercontent.com", callback);
    const second = createGoogleOAuthRequest("123.apps.googleusercontent.com", callback);
    const params = new URL(first.url).searchParams;
    expect(params.get("scope")).toBe("https://www.googleapis.com/auth/business.manage");
    expect(params.get("access_type")).toBe("offline");
    expect(params.get("code_challenge")).toBe(createHash("sha256").update(first.verifier).digest("base64url"));
    expect(first.state).not.toBe(second.state);
    expect(matchesGoogleOAuthState(first.state, first.state)).toBe(true);
    expect(matchesGoogleOAuthState(first.state, second.state)).toBe(false);
    expect(matchesGoogleOAuthState("", "")).toBe(false);
  });
  it("rejects unsafe redirects and invalid client IDs", () => {
    expect(() => createGoogleOAuthRequest("bad", callback)).toThrow();
    for (const url of [`http://taprater.com${GOOGLE_BUSINESS_CALLBACK_PATH}`, callback + "?next=evil", "https://taprater.com/other", `https://user:password@taprater.com${GOOGLE_BUSINESS_CALLBACK_PATH}`]) {
      expect(() => createGoogleOAuthRequest("123.apps.googleusercontent.com", url)).toThrow();
    }
    expect(() => createGoogleOAuthRequest("123.apps.googleusercontent.com", `http://localhost:3000${GOOGLE_BUSINESS_CALLBACK_PATH}`)).not.toThrow();
  });
});
