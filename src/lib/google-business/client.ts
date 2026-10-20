import { z } from "zod";

const accountSchema = z.object({ name: z.string(), accountName: z.string().optional(), type: z.string().optional() });
const locationSchema = z.object({ name: z.string(), title: z.string().optional() });
const replySchema = z.object({ comment: z.string().optional(), updateTime: z.string().optional() });
const reviewSchema = z.object({
  reviewId: z.string(), name: z.string().optional(),
  reviewer: z.object({ displayName: z.string().optional(), isAnonymous: z.boolean().optional() }).optional(),
  starRating: z.enum(["STAR_RATING_UNSPECIFIED", "ONE", "TWO", "THREE", "FOUR", "FIVE"]),
  comment: z.string().optional(), createTime: z.string().optional(), updateTime: z.string().optional(),
  reviewReply: replySchema.optional(),
});
export type GoogleReview = z.infer<typeof reviewSchema>;
export type GoogleBusinessErrorCode = "reconnect" | "access_denied" | "quota" | "unavailable" | "invalid_response";
export class GoogleBusinessError extends Error {
  constructor(public readonly code: GoogleBusinessErrorCode, public readonly status: number) {
    super({ reconnect: "Reconnect your Google account.", access_denied: "Google denied access. Check API approval, enabled APIs, and business permissions.", quota: "Google request quota is unavailable or exhausted. Check the project quota before retrying.", unavailable: "Google Business Profile is temporarily unavailable.", invalid_response: "Google returned an unexpected response." }[code]);
    this.name = "GoogleBusinessError";
  }
}

function resource(value: string, pattern: RegExp): string {
  if (!pattern.test(value)) throw new Error("Invalid Google Business Profile resource name.");
  return value;
}

/** Server-side transport only. The caller must authorize the account/location for its tenant.
 * No automatic write retries: a timed-out reply may already have been published by Google. */
export function createGoogleBusinessClient(accessToken: string, fetcher: typeof fetch = fetch) {
  if (!accessToken.trim()) throw new Error("A Google access token is required.");
  async function request<S extends z.ZodTypeAny>(url: URL, schema: S, body?: { comment: string }): Promise<z.output<S>> {
    let response: Response;
    try {
      response = await fetcher(url, {
        method: body ? "PUT" : "GET", cache: "no-store", redirect: "manual",
        signal: AbortSignal.timeout(15_000),
        headers: { Authorization: `Bearer ${accessToken}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch { throw new GoogleBusinessError("unavailable", 0); }
    if (!response.ok) {
      const code = response.status === 401 ? "reconnect" : response.status === 403 ? "access_denied" : response.status === 429 ? "quota" : "unavailable";
      // Never surface Google's raw body: it can contain account or credential details.
      throw new GoogleBusinessError(code, response.status);
    }
    try { return schema.parse(await response.json()); }
    catch { throw new GoogleBusinessError("invalid_response", response.status); }
  }
  return {
    listAccounts(pageToken?: string, parentAccount?: string) {
      const url = new URL("https://mybusinessaccountmanagement.googleapis.com/v1/accounts");
      if (parentAccount) url.searchParams.set("parentAccount", resource(parentAccount, /^accounts\/[A-Za-z0-9_-]+$/));
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      return request(url, z.object({ accounts: z.array(accountSchema).default([]), nextPageToken: z.string().optional() }));
    },
    listLocations(account: string, pageToken?: string) {
      const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${resource(account, /^accounts\/[A-Za-z0-9_-]+$/)}/locations`);
      url.searchParams.set("readMask", "name,title");
      url.searchParams.set("pageSize", "100");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      return request(url, z.object({ locations: z.array(locationSchema).default([]), nextPageToken: z.string().optional() }));
    },
    listReviews(parent: string, pageToken?: string) {
      const url = new URL(`https://mybusiness.googleapis.com/v4/${resource(parent, /^accounts\/[A-Za-z0-9_-]+\/locations\/[A-Za-z0-9_-]+$/)}/reviews`);
      url.searchParams.set("pageSize", "50");
      url.searchParams.set("orderBy", "updateTime desc");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      return request(url, z.object({ reviews: z.array(reviewSchema).default([]), averageRating: z.number().optional(), totalReviewCount: z.number().optional(), nextPageToken: z.string().optional() }));
    },
    getReview(reviewName: string) {
      const name = resource(reviewName, /^accounts\/[A-Za-z0-9_-]+\/locations\/[A-Za-z0-9_-]+\/reviews\/[A-Za-z0-9_-]+$/);
      return request(new URL(`https://mybusiness.googleapis.com/v4/${name}`), reviewSchema);
    },
    publishReply(reviewName: string, comment: string) {
      const trimmed = comment.trim();
      if (!trimmed || trimmed.length > 4096) throw new Error("Reply must contain 1–4096 characters.");
      const name = resource(reviewName, /^accounts\/[A-Za-z0-9_-]+\/locations\/[A-Za-z0-9_-]+\/reviews\/[A-Za-z0-9_-]+$/);
      return request(new URL(`https://mybusiness.googleapis.com/v4/${name}/reply`), replySchema, { comment: trimmed });
    },
  };
}
