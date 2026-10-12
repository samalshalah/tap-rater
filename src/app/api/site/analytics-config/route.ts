import { NextResponse } from "next/server";
import { getAnalyticsConfig } from "@/lib/storefront-analytics";
import { requestIsInternal } from "@/lib/storefront-analytics-server";
import { internalAnalyticsCookie } from "@/lib/analytics-attribution";
import { getCheckoutProducts } from "@/lib/product-repository";
import { metaCatalog } from "@/lib/meta-checkout";
import { metaPixelId } from "@/lib/meta-pixel";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const internal = requestIsInternal(request);
  let metaCatalogIds: Record<string, string> = {};
  if (!internal) try { metaCatalogIds = Object.fromEntries(metaCatalog(await getCheckoutProducts()).map(item => [`${item.product.slug}:${item.optionId}`, item.id])); } catch {}
  const response = NextResponse.json(
    {
      ...getAnalyticsConfig(),
      metaPixelId: !internal && Object.keys(metaCatalogIds).length ? metaPixelId : null,
      metaCatalogIds,
      ...(internal ? { measurementId: null, internal: true } : {}),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
  if (internal)
    response.cookies.set(internalAnalyticsCookie, "1", {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
      secure: true,
    });
  return response;
}
