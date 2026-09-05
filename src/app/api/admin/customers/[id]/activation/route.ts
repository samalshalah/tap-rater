import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { resendAdminCustomerActivation } from "@/lib/admin-customers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    return NextResponse.json({ error: "Customer activation request is invalid." }, { status: 400 });
  }

  const result = await resendAdminCustomerActivation(id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      {
        status: result.status,
        ...(result.retryAfterSeconds
          ? { headers: { "Retry-After": String(result.retryAfterSeconds) } }
          : {})
      }
    );
  }

  return NextResponse.json({ ok: true });
}
