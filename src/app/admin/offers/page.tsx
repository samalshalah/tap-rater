import { AdminShell } from "@/components/admin/admin-shell";
import { OffersForm } from "@/components/admin/offers-form";
import { requireAdmin } from "@/lib/admin-auth";
import { getOffersSettings, getOfferUsage } from "@/lib/offer-settings";
import { formatPrice } from "@/lib/products";
import { getCheckoutProducts } from "@/lib/product-repository";
export default async function OffersPage() {
  await requireAdmin();
  const [settings, products] = await Promise.all([
    getOffersSettings(),
    getCheckoutProducts(),
  ]);
  const usage = await getOfferUsage().catch(() => null);
  return (
    <AdminShell>
      <section className="tr-admin-section space-y-6">
        <h1 className="tr-admin-title">Offers</h1>
        <p>
          Manage automatic discounts, mixed-product bundles, eligibility, dates,
          and free shipping.
        </p>
        <section className="rounded-xl border border-line p-5">
          <h2 className="font-semibold">Offer usage · paid live orders</h2>
          <p className="text-sm text-muted my-2">
            All-time since activation. Excludes test and refunded orders.
            Merchandise amounts exclude shipping, tax, and subscription fees;
            this is attributed sales, not proof of incremental sales.
          </p>
          {usage === null ? (
            <p>Usage is temporarily unavailable.</p>
          ) : !usage.length ? (
            <p>No paid orders have used these offers yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    {[
                      "Offer",
                      "Orders",
                      "Savings",
                      "Discounted merchandise",
                    ].map((h) => (
                      <th className="p-2" key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usage.map((r) => (
                    <tr key={String(r.label)}>
                      <td className="p-2">{String(r.label)}</td>
                      <td>{String(r.orders)}</td>
                      <td>{formatPrice(Number(r.savings))}</td>
                      <td>{formatPrice(Number(r.merchandise))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <OffersForm
          initial={settings}
          products={products.map((p) => ({ slug: p.slug, title: p.title }))}
        />
      </section>
    </AdminShell>
  );
}
