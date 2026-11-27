import { beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
const delivery = vi.hoisted(() => vi.fn());
vi.mock("@/lib/email", async original => ({ ...await original<typeof import("@/lib/email")>(), sendEmail: delivery }));
import { getPublicProductReviews, getReviewInvitation, moderateProductReview, reviewDb, reviewToken, sendReviewInvitation, submitProductReview } from "@/lib/product-reviews";

const enabled = process.env.REVIEW_INVITATION_QA === "true";
describe.skipIf(!enabled)("review invitations on disposable Neon QA branch", () => {
  beforeAll(() => {
    if (!["ep-winter-feather-at2enh5j.c-9.us-east-1.aws.neon.tech", "ep-winter-feather-at2enh5j-pooler.c-9.us-east-1.aws.neon.tech"].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error("Refusing to run review fixtures outside the dedicated temporary QA branch.");
    if (process.env.RESEND_API_KEY) throw new Error("Real email credentials must not be loaded for review QA.");
    delivery.mockResolvedValue({ sent: true });
  });
  it("sends once under concurrency, accepts one review, requires consent and updates public ratings", async () => {
    const email = `qa-${randomUUID()}@example.invalid`;
    const results = await Promise.allSettled([sendReviewInvitation({ name: "QA Past Customer", email }), sendReviewInvitation({ name: "QA Past Customer", email })]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    const sent = results.find(r => r.status === "fulfilled") as PromiseFulfilledResult<{ id: string }>;
    expect(delivery).toHaveBeenCalledTimes(1);
    const html = delivery.mock.calls[0][0].html as string;
    const sql = reviewDb(); const [row] = await sql`SELECT * FROM product_review_invitations WHERE id = ${sent.value.id}`;
    const token = reviewToken(row.id, row.expires_at);
    expect(html).toContain(`/review/${token}`); expect(html).not.toContain("5-star review");
    expect(await getReviewInvitation(token)).not.toBeNull();
    const input = { rating: 2, displayName: "QA Customer", businessName: "QA shop", body: "Honest feedback: setup could be clearer.", publishPermission: true, photoPermission: false };
    await submitProductReview(token, input, null);
    await expect(submitProductReview(token, input, null)).rejects.toThrow("already been used");
    expect((await getPublicProductReviews("google-review-stand")).reviews.some(r => r.id === row.id)).toBe(false);
    await moderateProductReview(row.id, "published");
    expect((await getPublicProductReviews("google-review-stand")).reviews.find(r => r.id === row.id)?.rating).toBe(2);
    await moderateProductReview(row.id, "private");
    expect((await getPublicProductReviews("google-review-stand")).reviews.some(r => r.id === row.id)).toBe(false);
    await expect(sendReviewInvitation({ name: "QA", email })).rejects.toThrow("already submitted");
  }, 60000);
  it("retains a failed-send idempotency key and refuses to publish private feedback", async () => {
    delivery.mockClear(); delivery.mockResolvedValueOnce({ sent: false, reason: "QA failure" }).mockResolvedValue({ sent: true });
    const email = `qa-${randomUUID()}@example.invalid`;
    await expect(sendReviewInvitation({ name: "QA Private", email })).rejects.toThrow("could not be sent");
    const sent = await sendReviewInvitation({ name: "QA Private", email });
    expect(delivery.mock.calls[0][0].delivery.idempotencyKey).toBe(delivery.mock.calls[1][0].delivery.idempotencyKey);
    expect(delivery.mock.calls[0][0].html).toBe(delivery.mock.calls[1][0].html);
    const sql = reviewDb(); const [row] = await sql`SELECT * FROM product_review_invitations WHERE id = ${sent.id}`;
    await submitProductReview(reviewToken(row.id, row.expires_at), { rating: 1, displayName: "Private QA", body: "I want this feedback kept private.", publishPermission: false, photoPermission: false }, null);
    await expect(moderateProductReview(sent.id, "published")).rejects.toThrow("publication permission");
  }, 60000);
});
