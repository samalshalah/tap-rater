import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { refundAdminOrder } from "@/lib/order-refunds";

type RefundRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RefundRouteContext) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  if (body?.confirmation !== "REFUND") {
    return NextResponse.json(
      { error: "Confirm the full refund before continuing." },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const result = await refundAdminOrder(id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    refundId: result.refundId,
    alreadyRefunded: result.alreadyRefunded,
  });
}
