import { neon } from "@neondatabase/serverless";
import { z } from "zod";

export type ReviewActor = { kind: "customer"; email: string } | { kind: "admin" };
export type SampleReview = { id: string; reviewer: string; rating: number; comment: string; reply: string; status: "draft" | "ready"; version: number };
export type ReviewWorkspace = { businessId: string; businessName: string; reviews: SampleReview[] };
export const reviewDraftSchema = z.object({
  id: z.string().uuid(),
  reply: z.string().trim().max(4000),
  status: z.enum(["draft", "ready"]),
  version: z.number().int().positive().max(2147483646),
}).strict().refine(value => value.status !== "ready" || value.reply.length > 0, { message: "Write a reply before marking it ready." });

function database() {
  const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("Review workspace storage is not configured.");
  return neon(url);
}
export async function listReviewWorkspaces(actor: ReviewActor, sql = database()): Promise<ReviewWorkspace[]> {
  // Authorize in the query, never by a client-supplied customer or business identifier.
  const rows = await sql`SELECT b.id, b.business_name FROM review_workspaces w
    JOIN businesses b ON b.id = w.business_id JOIN customers c ON c.id = b.customer_id
    WHERE ${actor.kind === "admin"} OR (lower(c.email) = ${actor.kind === "customer" ? actor.email.trim().toLowerCase() : ""} AND c.account_status = 'active')
    ORDER BY b.business_name`;
  const workspaces: ReviewWorkspace[] = [];
  for (const row of rows) {
    const reviews = await sql`SELECT r.id,r.reviewer,r.rating,r.comment,r.reply,r.status,r.version FROM workspace_sample_reviews r
      JOIN businesses b ON b.id=r.business_id JOIN customers c ON c.id=b.customer_id
      WHERE r.business_id=${row.id} AND (${actor.kind === "admin"} OR (lower(c.email)=${actor.kind === "customer" ? actor.email.trim().toLowerCase() : ""} AND c.account_status='active'))
      ORDER BY r.sample_key`;
    workspaces.push({ businessId: String(row.id), businessName: String(row.business_name), reviews: reviews as SampleReview[] });
  }
  return workspaces;
}
export async function saveSampleReply(actor: ReviewActor, input: unknown, sql = database()) {
  const value = reviewDraftSchema.parse(input);
  // A single conditional update enforces ownership and prevents stale tabs overwriting newer drafts.
  const rows = await sql`UPDATE workspace_sample_reviews r SET reply=${value.reply}, status=${value.status},
    version=r.version+1,updated_at=now() FROM businesses b JOIN customers c ON c.id=b.customer_id
    WHERE r.id=${value.id} AND r.business_id=b.id AND r.version=${value.version}
    AND (${actor.kind === "admin"} OR (lower(c.email)=${actor.kind === "customer" ? actor.email.trim().toLowerCase() : ""} AND c.account_status='active'))
    RETURNING r.id,r.reply,r.status,r.version`;
  return rows[0] ?? null;
}
