import Link from "next/link";
import { getCheckoutProducts } from "@/lib/product-repository";
import { getOffersSettings } from "@/lib/offer-settings";
import { parseMetaCheckout } from "@/lib/meta-checkout";
import { MetaCheckout } from "@/components/checkout/meta-checkout";

export const dynamic = "force-dynamic";
export const metadata = { title: "Finish your stand setup", robots: { index: false, follow: false } };

export default async function MetaCheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  let catalog;
  try { catalog = await getCheckoutProducts(); }
  catch { return <main className="tr-container py-12"><h1 className="text-2xl">The shop is temporarily unavailable</h1><p className="mt-3">Please refresh in a moment. Your existing cart has not changed.</p></main>; }
  let entries;
  try { entries = parseMetaCheckout(params.products, catalog); }
  catch (error) { return <main className="tr-container py-12"><h1 className="text-2xl">Check your shopping link</h1><p role="alert" className="my-4">{error instanceof Error ? error.message : "Please return to the shop."}</p><Link href="/shop" className="underline">Return to shop</Link></main>; }
  return <MetaCheckout entries={entries} offers={await getOffersSettings()} hasCoupon={Boolean(params.coupon)} />;
}
