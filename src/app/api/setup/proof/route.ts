import { NextResponse } from "next/server";
import { checkoutCartSchema } from "@/lib/validators";
import { getStorefrontProductBySlug } from "@/lib/product-repository";
import { getProductPurchaseOptions, isHostedPurchaseOptionEnabled } from "@/lib/purchase-options";
import { productSupportsMultiLink } from "@/lib/service-addons";
import { checkPublicRateLimit, rateLimitResponse } from "@/lib/public-rate-limit";
import { createBrandedProof, requireProofStorage, reserveBrandedHostedDestination } from "@/lib/branded-proof";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rateLimit = await checkPublicRateLimit(request, "setup-proof", "PUBLIC_FORM_RATE_LIMITER");
  if (rateLimit.limited) return rateLimitResponse();
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Stand setup is missing.");
    let body = "";
    let size = 0;
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32 * 1024) { await reader.cancel(); throw new Error("Stand setup is too large."); }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    const input = JSON.parse(body);
    const parsed = checkoutCartSchema.safeParse({ items: [input.item] });
    if (!parsed.success || parsed.data.items[0]?.optionId !== "branded_qr_direct") throw new Error("A valid Branded stand setup is required.");
    const item = parsed.data.items[0];
    const product = await getStorefrontProductBySlug(item.productId);
    if (!product?.isActive || !getProductPurchaseOptions(product).some((option) => option.id === "branded_qr_direct")) throw new Error("This Branded stand is unavailable.");
    const setup = item.setup ?? {};
    if (setup.serviceAddon === "hosted_multilink" && (!productSupportsMultiLink(product) || !isHostedPurchaseOptionEnabled())) throw new Error("Multi-Link is unavailable for this stand.");
    const storage = await requireProofStorage();
    if (input.action === "reserve" && setup.serviceAddon === "hosted_multilink") {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://taprater.com";
      const reservation = await reserveBrandedHostedDestination(product.slug, storage, siteUrl);
      return NextResponse.json({ reservation: { id: reservation.id, url: reservation.url } }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const proof = await createBrandedProof(product, setup, storage);
    return NextResponse.json(proof, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Preview could not be created." }, { status: 400 });
  }
}
