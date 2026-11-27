import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { readRequestTextWithLimit, RequestBodyTooLargeError } from "@/lib/http-request";
import { listAdminProductReviews, moderateProductReview, ProductReviewError, sendReviewInvitation } from "@/lib/product-reviews";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
function failure(error: unknown) {
  return Response.json({ error: error instanceof ProductReviewError ? error.message : "The request could not be completed. Please try again." },
    { status: error instanceof ProductReviewError ? error.status : error instanceof RequestBodyTooLargeError ? 413 : 500, headers });
}
export async function GET(request: Request) {
  const auth = await requireAdminApi(); if (auth) return auth;
  const page = Math.max(1, Math.min(10000, Math.floor(Number(new URL(request.url).searchParams.get("page")) || 1)));
  try { return Response.json(await listAdminProductReviews(page), { headers }); } catch (e) { return failure(e); }
}
export async function POST(request: Request) {
  const auth = await requireAdminApi(); if (auth) return auth;
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin." }, { status: 403, headers });
  try {
    const input = JSON.parse(await readRequestTextWithLimit(request, 4096));
    if (input.action === "invite") return Response.json(await sendReviewInvitation(input), { headers });
    const action = z.object({ action: z.literal("moderate"), id: z.string().uuid(), status: z.enum(["published", "private"]) }).safeParse(input);
    if (!action.success) throw new ProductReviewError("Invalid review action.");
    await moderateProductReview(action.data.id, action.data.status);
    return Response.json({ ok: true }, { headers });
  } catch (e) { return failure(e); }
}
