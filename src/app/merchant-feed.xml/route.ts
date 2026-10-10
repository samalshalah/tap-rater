import { buildMerchantFeed } from "@/lib/merchant-feed";
import { getCheckoutProducts } from "@/lib/product-repository";
import { getOffersSettings } from "@/lib/offer-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Strict catalog read: a storage outage must not publish a stale/empty feed.
    const [products, offers] = await Promise.all([getCheckoutProducts(), getOffersSettings()]);
    return new Response(buildMerchantFeed(products, offers), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Product feed temporarily unavailable. Please retry.", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "300" },
    });
  }
}
