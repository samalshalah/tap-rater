import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { retryAdminEmailDelivery } from "@/lib/admin-email-deliveries";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Email retry request is invalid." }, { status: 400 });
  }

  const result = await retryAdminEmailDelivery(id);
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
