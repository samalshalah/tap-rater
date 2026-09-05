import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { refundAdminOrder } from "@/lib/order-refunds";

type RefundRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RefundRouteContext) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Order identifier is invalid." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (body?.confirmation !== "REFUND") {
    return NextResponse.json(
      { error: "Confirm the full refund before continuing." },
      { status: 400 },
    );
  }
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
