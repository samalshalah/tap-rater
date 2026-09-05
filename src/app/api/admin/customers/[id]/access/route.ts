import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { updateAdminCustomerAccess } from "@/lib/admin-customers";
import { adminCustomerAccessSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const parsed = adminCustomerAccessSchema.safeParse(await request.json().catch(() => null));
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id) || !parsed.success) {
    return NextResponse.json({ error: "Customer access update is invalid." }, { status: 400 });
  }

  try {
    const result = await updateAdminCustomerAccess(id, parsed.data.status);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Customer access could not be updated." }, { status: 400 });
  }
}
