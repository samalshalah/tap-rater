import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseReviewToken, reviewToken } from "@/lib/product-reviews";
import { sanitizeReviewPhoto } from "@/lib/product-review-photo";
import { emptyProductReviews, invitationSchema, productReviewJsonLd, reviewSubmissionSchema } from "@/lib/product-review-shared";
import { ProductReviewForm } from "@/components/forms/product-review-form";
import { analyticsPage } from "@/lib/storefront-analytics";
import { isSafeProductMediaKey } from "@/lib/admin-media-storage";

afterEach(() => vi.unstubAllEnvs());
describe("product review invitations", () => {
  it("authenticates purpose-bound links and rejects tampering, expired and malformed links", () => {
    vi.stubEnv("CUSTOMER_SESSION_SECRET", "test-secret");
    const id = "98d73b1e-d364-4077-8f7a-c351205ea3cf";
    const expires = new Date(Date.now() + 60000).toISOString();
    const token = reviewToken(id, expires);
    expect(parseReviewToken(token)?.id).toBe(id);
    expect(parseReviewToken(token.replace(id, "18d73b1e-d364-4077-8f7a-c351205ea3cf"))).toBeNull();
    expect(parseReviewToken(token, new Date(expires).getTime())).toBeNull();
    expect(parseReviewToken("bad-link")).toBeNull();
    vi.stubEnv("CUSTOMER_SESSION_SECRET", "changed-secret");
    expect(parseReviewToken(token)).toBeNull();
  });
  it("normalizes customer emails and rejects invalid recipients and oversized names", () => {
    expect(invitationSchema.parse({ name: " Sam ", email: " CUSTOMER@EXAMPLE.COM " })).toEqual({ name: "Sam", email: "customer@example.com" });
    expect(invitationSchema.safeParse({ name: "a".repeat(101), email: "invalid" }).success).toBe(false);
  });
  it("requires a genuine rating and accepts private, critical feedback", () => {
    const input = { rating: 1, displayName: "Customer", body: "The setup could be clearer.", publishPermission: false, photoPermission: false };
    expect(reviewSubmissionSchema.safeParse(input).success).toBe(true);
    for (const rating of [0, 6, 4.5, ""]) expect(reviewSubmissionSchema.safeParse({ ...input, rating }).success).toBe(false);
    expect(reviewSubmissionSchema.safeParse({ ...input, body: "short" }).success).toBe(false);
  });
  it("leaves publication opt-in and supports camera and gallery without requiring a photo or account", () => {
    const html = renderToStaticMarkup(createElement(ProductReviewForm, { token: "private-link", firstName: "Sam" }));
    expect(html.match(/name="rating"/g)).toHaveLength(5);
    const permission = html.match(/<input[^>]*name="publishPermission"[^>]*>/)?.[0];
    expect(permission).toBeDefined(); expect(permission).not.toContain("checked"); expect(permission).not.toContain("required");
    expect(html).toContain('capture="environment"');
    expect(html.match(/type="file"/g)).toHaveLength(2);
    expect(html).not.toContain('name="email"'); expect(html).not.toContain('name="orderNumber"');
  });
  it("does not expose invitation tokens to analytics or private R2 keys through product media", () => {
    expect(analyticsPage("/review/private-token")).toBeNull();
    expect(isSafeProductMediaKey("product-reviews/secret/photo.jpg")).toBe(false);
  });
  it("only adds review schema when genuine published reviews exist", () => {
    expect(productReviewJsonLd(emptyProductReviews)).toEqual({});
    const data = productReviewJsonLd({ count: 1, average: 2, reviews: [{ id: "1", display_name: "Lee", business_name: null, rating: 2, review_body: "Setup needs improvement.", submitted_at: "2026-11-27T10:00:00Z", has_photo: false }] });
    expect(data.aggregateRating?.ratingValue).toBe(2); expect(data.review?.[0].reviewBody).toContain("improvement");
  });
  it("removes GPS/EXIF and comments, and preserves a decodable photo", async () => {
    const jpeg = await sharp({ create: { width: 100, height: 80, channels: 3, background: "#6035ff" } }).jpeg().toBuffer();
    const metadata = Buffer.from([255, 225, 0, 16, ...Buffer.from("Exif-GPS-HERE!")]);
    const input = Buffer.concat([jpeg.subarray(0, 2), metadata, jpeg.subarray(2)]);
    const output = sanitizeReviewPhoto(new Uint8Array(input).buffer);
    expect(Buffer.from(output).includes(Buffer.from("Exif-GPS"))).toBe(false);
    expect((await sharp(Buffer.from(output)).metadata()).width).toBe(100);
    expect(() => sanitizeReviewPhoto(new Uint8Array([1, 2, 3]).buffer)).toThrow();
    expect(() => sanitizeReviewPhoto(new Uint8Array(jpeg.subarray(0, jpeg.length - 2)).buffer)).toThrow();
  });
});
