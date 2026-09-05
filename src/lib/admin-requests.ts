import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import type { AdminRequestUpdateInput } from "@/lib/validators";

export type AdminRequestType = "contact" | "setup" | "link-change";

export type AdminRequestDbClient = {
  from: (table: string) => any;
};

export type AdminRequestUpdateResult =
  | {
      ok: true;
      status: AdminRequestUpdateInput["status"];
      adminNotes: string;
      updatedAt: string;
      resolvedAt?: string;
    }
  | { ok: false; error: string; status: number };

const requestTables: Record<AdminRequestType, string> = {
  contact: "contact_requests",
  setup: "setup_requests",
  "link-change": "change_link_requests"
};

export function isAdminRequestType(value: string): value is AdminRequestType {
  return value === "contact" || value === "setup" || value === "link-change";
}

export async function updateAdminRequest(
  type: AdminRequestType,
  id: string,
  input: AdminRequestUpdateInput
): Promise<AdminRequestUpdateResult> {
  if (!hasSupabaseAdminConfig()) {
    return { ok: false, error: "Request storage is not configured.", status: 503 };
  }

  return updateAdminRequestWithClient(getSupabaseAdmin() as AdminRequestDbClient, type, id, input);
}

export async function updateAdminRequestWithClient(
  client: AdminRequestDbClient,
  type: AdminRequestType,
  id: string,
  input: AdminRequestUpdateInput,
  now = new Date()
): Promise<AdminRequestUpdateResult> {
  const updatedAt = now.toISOString();
  const resolvedAt = input.status === "resolved" ? updatedAt : null;

  try {
    const { data, error } = await client
      .from(requestTables[type])
      .update({
        status: input.status,
        admin_notes: input.adminNotes,
        resolved_at: resolvedAt,
        updated_at: updatedAt
      })
      .eq("id", id)
      .select("id,status,admin_notes,resolved_at,updated_at")
      .maybeSingle();

    if (error) return { ok: false, error: "Request status could not be saved.", status: 500 };
    if (!data?.id) return { ok: false, error: "Request was not found.", status: 404 };
    return {
      ok: true,
      status: input.status,
      adminNotes: input.adminNotes,
      updatedAt,
      ...(resolvedAt ? { resolvedAt } : {})
    };
  } catch {
    return { ok: false, error: "Request status could not be saved.", status: 500 };
  }
}
