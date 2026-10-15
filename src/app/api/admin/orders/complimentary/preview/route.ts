import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { complimentaryCatalog, complimentaryDesignSchema } from "@/lib/complimentary-orders";
import { getStorefrontProducts } from "@/lib/product-repository";
import { isSafeProductMediaKey } from "@/lib/admin-media-storage";
import { composeProductionArtworkDocument, getProductionArtworkTemplate } from "@/lib/production-artwork";
import type { OrderLineItem } from "@/lib/orders";

const schema = z.object({ item: z.object({ productId: z.string(), setup: complimentaryDesignSchema.extend({
  businessName: z.string().trim().min(1).max(120),
  destinationUrl: z.string().url().max(2048).refine(v => /^https?:\/\//i.test(v)),
  logoStorageKey: z.string().max(500).refine(isSafeProductMediaKey)
}) }) });

export async function POST(request: Request) {
  const auth = await requireAdminApi(); if (auth) return auth;
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Enter a business name, valid link and logo before previewing." }, { status: 400 });
  try {
    const { productId, setup } = input.data.item;
    const entry = complimentaryCatalog(await getStorefrontProducts()).find(e => e.product.slug === productId && e.options.some(o => o.id === "branded_qr_direct"));
    if (!entry) return NextResponse.json({ error: "This branded stand is unavailable." }, { status: 400 });
    const item: OrderLineItem = { productId, title: entry.product.title, sku: entry.product.sku, optionId: "branded_qr_direct", quantity: 1, unitAmountCents: 0, lineSubtotalCents: 0,
      setup: { ...setup, frontTemplateUrl: entry.product.assetSet?.brandedFrontTemplateUrl, logoMediaUrl: `/api/media/product/${setup.logoStorageKey}`, qrTargetUrl: setup.destinationUrl } };
    const template = getProductionArtworkTemplate(item);
    if (!template) throw new Error("Template unavailable.");
    const result = await composeProductionArtworkDocument(item, template, "preview", new Date().toISOString());
    return NextResponse.json({ svg: result.svg, snapshot: setup, proofReceiptId: crypto.randomUUID() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not render this design. Check the logo and retry." }, { status: 400 });
  }
}
