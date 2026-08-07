import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { updateOrderLineItem } from "@/lib/orders";
import { orderLineItemUpdateSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const parsed = orderLineItemUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Request is invalid." }, { status: 400 });
  }

  const result = await updateOrderLineItem(parsed.data);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
