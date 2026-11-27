import { getReviewInvitation, ProductReviewError, submitProductReview } from "@/lib/product-reviews";
import { maxReviewPhotoBytes, saveReviewPhoto } from "@/lib/product-review-photo";
import { reviewSubmissionSchema } from "@/lib/product-review-shared";
import { checkSupportFormRateLimit } from "@/lib/support-form-security";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin." }, { status: 403, headers });
  const limited = await checkSupportFormRateLimit(request); if (limited) return limited;
  try {
    // Bound the stream itself; Content-Length can be missing or untrustworthy.
    const reader = request.body?.getReader();
    if (!reader) throw new ProductReviewError("The form is empty.");
    const chunks: Uint8Array<ArrayBuffer>[] = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > maxReviewPhotoBytes + 32768) { await reader.cancel(); throw new ProductReviewError("This photo is too large. Please choose a smaller photo.", 413); }
        chunks.push(new Uint8Array(value));
      }
    } finally { reader.releaseLock(); }
    const form = await new Response(new Blob(chunks), { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
    const token = String(form.get("token") ?? "");
    const invitation = await getReviewInvitation(token);
    if (!invitation) throw new ProductReviewError("This invitation link is invalid or expired. Reply to your invitation email for help.", 410);
    if (invitation.rating !== null) throw new ProductReviewError("Your review has already been received. Thank you!", 409);
    const parsed = reviewSubmissionSchema.safeParse({
      rating: form.get("rating"), displayName: form.get("displayName"), businessName: form.get("businessName") ?? "",
      body: form.get("body"), publishPermission: form.get("publishPermission") === "true", photoPermission: form.get("photoPermission") === "true",
    });
    if (!parsed.success) throw new ProductReviewError("Choose a rating, add your display name, and write 10–2,000 characters of feedback.");
    const file = form.get("photo");
    const key = file instanceof File && file.size > 0 ? await saveReviewPhoto(invitation.id, file) : null;
    await submitProductReview(token, parsed.data, key);
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof ProductReviewError ? error.message : "We could not save your feedback. Please try again." },
      { status: error instanceof ProductReviewError ? error.status : 500, headers });
  }
}
