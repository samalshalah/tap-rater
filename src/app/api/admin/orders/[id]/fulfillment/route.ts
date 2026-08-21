import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { updateOrderFulfillment } from "@/lib/orders";
import { orderFulfillmentUpdateSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const parsed = orderFulfillmentUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Fulfillment update is invalid." }, { status: 400 });
  }

  const result = await updateOrderFulfillment(id, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
