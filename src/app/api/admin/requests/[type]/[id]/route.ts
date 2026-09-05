import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { isAdminRequestType, updateAdminRequest } from "@/lib/admin-requests";
import { adminRequestUpdateSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ type: string; id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { type, id } = await context.params;
  if (!isAdminRequestType(type) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Request identifier is invalid." }, { status: 400 });
  }

  const parsed = adminRequestUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Request update is invalid." }, { status: 400 });
  }

  const result = await updateAdminRequest(type, id, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    status: result.status,
    adminNotes: result.adminNotes,
    updatedAt: result.updatedAt,
    resolvedAt: result.resolvedAt ?? null
  });
}
