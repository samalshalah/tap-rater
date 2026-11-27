import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { getProductMediaBucket } from "@/lib/admin-media-storage";
import { reviewDb } from "@/lib/product-reviews";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex" };
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const missing = () => new Response(null, { status: 404, headers });
  if (!z.string().uuid().safeParse(id).success) return missing();
  try {
    const sql = reviewDb();
    const rows = await sql`SELECT photo_key, moderation_status, publish_permission, photo_permission FROM product_review_invitations WHERE id = ${id} AND photo_key IS NOT NULL`;
    const row = rows[0];
    if (!row) return missing();
    if (!(row.moderation_status === "published" && row.publish_permission && row.photo_permission) && await requireAdminApi()) return missing();
    const bucket = await getProductMediaBucket();
    const object = await bucket?.get(String(row.photo_key));
    const body = object?.body ?? await object?.arrayBuffer?.();
    return body ? new Response(body, { headers: { ...headers, "Content-Type": "image/jpeg", "Content-Disposition": "inline; filename=stand-photo.jpg" } }) : missing();
  } catch { return missing(); }
}
