import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { buildEmailHtml, getCustomerReplyToEmail, sendEmail } from "@/lib/email";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { publicDataCache, invalidatePublicData } from "@/lib/public-data-cache";
import { emptyProductReviews, invitationCopy, invitationSchema, invitationSubject, reviewProductSlug, reviewSubmissionSchema, type PublicProductReview, type PublicProductReviews } from "@/lib/product-review-shared";

export class ProductReviewError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export type ReviewInvitation = {
  id: string; customer_name: string; email: string; expires_at: string; created_at: string;
  email_status: "sending" | "sent" | "failed"; send_sequence: number; sent_at: string | null;
  rating: number | null; display_name: string | null; business_name: string | null;
  review_body: string | null; photo_key: string | null;
  publish_permission: boolean; photo_permission: boolean; submitted_at: string | null;
  moderation_status: "pending" | "published" | "private";
};
export function reviewDb() {
  const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!url) throw new ProductReviewError("Review storage is temporarily unavailable.", 503);
  return neon(url);
}
function signingSecret() {
  const secret = process.env.CUSTOMER_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new ProductReviewError("Review invitations are not configured.", 503);
  return secret;
}
export function reviewToken(id: string, expiresAt: string) {
  const payload = `${id}.${new Date(expiresAt).getTime()}`;
  return `${payload}.${createHmac("sha256", signingSecret()).update(`product-review-v1:${payload}`).digest("hex")}`;
}
export function parseReviewToken(token: string, now = Date.now()) {
  const match = /^([a-f0-9-]{36})\.(\d{13})\.([a-f0-9]{64})$/.exec(token);
  if (!match || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(match[1]) || Number(match[2]) <= now) return null;
  const expected = reviewToken(match[1], new Date(Number(match[2])).toISOString()).split(".")[2];
  return timingSafeEqual(Buffer.from(match[3], "hex"), Buffer.from(expected, "hex"))
    ? { id: match[1], expires: Number(match[2]) } : null;
}
export async function getReviewInvitation(token: string): Promise<ReviewInvitation | null> {
  const parsed = parseReviewToken(token);
  if (!parsed) return null;
  const sql = reviewDb();
  const rows = await sql`SELECT * FROM product_review_invitations WHERE id = ${parsed.id} AND expires_at > now()`;
  const row = rows[0] as ReviewInvitation | undefined;
  return row && new Date(row.expires_at).getTime() === parsed.expires ? row : null;
}

export async function sendReviewInvitation(input: unknown) {
  const data = invitationSchema.safeParse(input);
  if (!data.success) throw new ProductReviewError("Enter a customer name and a valid email address.");
  signingSecret();
  const sql = reviewDb();
  // Reserve before sending. A single customer cannot receive concurrent duplicate invitations.
  // Failed/uncertain deliveries retain the same payload and provider idempotency key.
  const rows = await sql`INSERT INTO product_review_invitations (id, customer_name, email)
    VALUES (${randomUUID()}, ${data.data.name}, ${data.data.email})
    ON CONFLICT (email) DO UPDATE SET email_status = 'sending', last_attempt_at = now(),
      send_sequence = CASE WHEN product_review_invitations.email_status = 'sent' THEN product_review_invitations.send_sequence + 1 ELSE product_review_invitations.send_sequence END,
      expires_at = CASE WHEN product_review_invitations.expires_at <= now() THEN date_trunc('milliseconds', now() + interval '90 days') ELSE product_review_invitations.expires_at END
    WHERE product_review_invitations.rating IS NULL
      AND (product_review_invitations.sent_at IS NULL OR product_review_invitations.sent_at < now() - interval '24 hours')
      AND (product_review_invitations.email_status <> 'sending' OR product_review_invitations.last_attempt_at < now() - interval '10 minutes')
    RETURNING *`;
  const row = rows[0] as ReviewInvitation | undefined;
  if (!row) throw new ProductReviewError("This customer has already submitted a review, or an invitation was sent within the last 24 hours. A send already in progress can be retried after 10 minutes.", 409);
  const url = new URL(`/review/${reviewToken(row.id, row.expires_at)}`, getPublicSiteUrl()).href;
  const result = await sendEmail({
    to: row.email, subject: invitationSubject,
    html: buildEmailHtml({ title: "How is your stand working?", eyebrow: "YOUR TAP RATER EXPERIENCE", body: invitationCopy(row.customer_name, row.expires_at), cta: { label: "Share your experience", url } }),
    replyTo: getCustomerReplyToEmail(),
    delivery: { messageType: "product_review_invitation", audience: "customer", entityType: "product_review_invitation", entityId: row.id, retryable: false, idempotencyKey: `product-review:${row.id}:${row.send_sequence}` },
  });
  await sql`UPDATE product_review_invitations SET email_status = ${result.sent ? "sent" : "failed"},
    sent_at = CASE WHEN ${result.sent} THEN now() ELSE sent_at END WHERE id = ${row.id} AND send_sequence = ${row.send_sequence}`;
  if (!result.sent) throw new ProductReviewError("The email could not be sent. Check Emails & Notifications, then retry this invitation.", 502);
  return { id: row.id, sent: true };
}

export async function submitProductReview(token: string, input: unknown, photoKey: string | null) {
  const parsed = parseReviewToken(token);
  if (!parsed) throw new ProductReviewError("This invitation link is invalid or expired.", 410);
  const data = reviewSubmissionSchema.safeParse(input);
  if (!data.success) throw new ProductReviewError("Choose a rating, add your display name, and write 10–2,000 characters of feedback.");
  const d = data.data;
  const sql = reviewDb();
  const rows = await sql`UPDATE product_review_invitations SET rating = ${d.rating}, display_name = ${d.displayName},
    business_name = ${d.businessName || null}, review_body = ${d.body}, photo_key = ${photoKey},
    publish_permission = ${d.publishPermission}, photo_permission = ${Boolean(photoKey && d.photoPermission)}, submitted_at = now()
    WHERE id = ${parsed.id} AND rating IS NULL AND expires_at > now() AND expires_at = ${new Date(parsed.expires).toISOString()}::timestamptz RETURNING id`;
  if (!rows.length) throw new ProductReviewError("This invitation has already been used or has expired.", 409);
}

export async function listAdminProductReviews(page = 1) {
  const sql = reviewDb();
  const rows = await sql`SELECT *, count(*) OVER()::int AS total FROM product_review_invitations
    ORDER BY COALESCE(submitted_at, created_at) DESC, id LIMIT 25 OFFSET ${(page - 1) * 25}`;
  return { rows: rows as (ReviewInvitation & { total: number })[], total: Number(rows[0]?.total ?? 0) };
}

const reviewCacheTag = "public-product-reviews-v1";
const readPublicReviews = publicDataCache(async (slug: string): Promise<PublicProductReviews> => {
  const sql = reviewDb();
  const rows = await sql`SELECT id, display_name, business_name, rating, review_body, submitted_at,
    (photo_key IS NOT NULL AND photo_permission) AS has_photo,
    count(*) OVER()::int AS total, round(avg(rating) OVER(), 1)::float AS average
    FROM product_review_invitations WHERE product_slug = ${slug} AND moderation_status = 'published' AND publish_permission
    ORDER BY submitted_at DESC, id LIMIT 50`;
  return { reviews: rows.map(({ total: _total, average: _average, ...row }) => row as PublicProductReview), count: Number(rows[0]?.total ?? 0), average: rows.length ? Number(rows[0].average) : null };
}, reviewCacheTag, reviewCacheTag);
export async function getPublicProductReviews(slug: string) {
  if (slug !== reviewProductSlug || !(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL)) return emptyProductReviews;
  try { return await readPublicReviews(slug); } catch { return emptyProductReviews; }
}
export async function moderateProductReview(id: string, status: "published" | "private") {
  const sql = reviewDb();
  const rows = await sql`UPDATE product_review_invitations SET moderation_status = ${status}, moderated_at = now()
    WHERE id = ${id} AND rating IS NOT NULL AND (${status} <> 'published' OR publish_permission) RETURNING id`;
  if (!rows.length) throw new ProductReviewError("Only a submitted review with publication permission can be published.", 409);
  invalidatePublicData(reviewCacheTag);
}
