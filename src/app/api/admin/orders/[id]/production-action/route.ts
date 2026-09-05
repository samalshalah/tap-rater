import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { applyAdminOrderProductionAction } from "@/lib/orders";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const productionActionSchema = z.object({
  action: z.enum(["approve_proof_manually", "regenerate_artwork", "request_customer_changes"]),
  note: z.string().max(2000).optional()
});

export async function POST(request: Request, context: RouteContext) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Order identifier is invalid." }, { status: 400 });
  }
  const parsed = productionActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Production action is invalid." }, { status: 400 });
  }

  const result = await applyAdminOrderProductionAction(id, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }

  return NextResponse.json({ ok: true, productionStatus: result.order.production_status });
}
