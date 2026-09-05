import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { updateAdminInventory } from "@/lib/admin-inventory";
import { adminInventoryUpdateSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { slug } = await context.params;
  if (!/^[a-z0-9-]{2,120}$/.test(slug)) {
    return NextResponse.json({ error: "Product identifier is invalid." }, { status: 400 });
  }

  const parsed = adminInventoryUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Inventory update is invalid." }, { status: 400 });
  }

  const result = await updateAdminInventory(slug, parsed.data.stockStatus);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, stockStatus: result.stockStatus });
}
