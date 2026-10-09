import { requireAdminApi } from "@/lib/admin-auth";
import { offersSchema } from "@/lib/offers";
import { saveOffersSettings } from "@/lib/offer-settings";
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return new Response(null, { status: 403 });
  const raw = await request.text();
  if (raw.length > 20000) return new Response(null, { status: 413 });
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid offers." }, { status: 400 });
  }
  const parsed = offersSchema.safeParse(input);
  if (!parsed.success)
    return Response.json(
      { error: parsed.error.issues[0]?.message || "Invalid offers." },
      { status: 400 },
    );
  try {
    await saveOffersSettings(parsed.data);
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Offers could not be saved. Please retry." },
      { status: 503 },
    );
  }
}
