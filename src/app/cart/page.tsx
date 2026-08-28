import { CartTable } from "@/components/cart/cart-table";
import { SectionShell } from "@/components/storefront/section";
import { getStripeModeSafe } from "@/lib/checkout";

export const dynamic = "force-dynamic";

export default function CartPage() {
  const stripeMode = getStripeModeSafe() === "live" ? "live" : "test";

  return (
    <main className="tr-public-shell text-ink">
      <SectionShell spacing="compact">
        <div className="tr-container">
        <p className="tr-eyebrow">Cart</p>
        <h1 className="tr-page-title mt-4 max-w-4xl">Your configured stands</h1>
        <p className="tr-body mt-5 max-w-3xl text-[1.05rem]">
          Review each QR + NFC stand before checkout. Quantity duplicates the exact same configured stand.
        </p>
        <div className="mt-10">
          <CartTable stripeMode={stripeMode} />
        </div>
        </div>
      </SectionShell>
    </main>
  );
}
