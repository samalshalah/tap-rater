import { AccountShell } from "@/components/account/account-shell";
import { requireCustomer } from "@/lib/customer-auth";
import { getCustomerPortal } from "@/lib/customer-portal";

export default async function AccountBusinessPage() {
  const session = await requireCustomer();
  const portal = await getCustomerPortal(session.email);

  return (
    <AccountShell>
      <section className="tr-card p-6">
        <p className="tr-eyebrow">Business</p>
        <h2 className="mt-2 text-xl font-medium text-ink">Saved business profiles</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Business names and destination links saved from submitted stand orders.</p>
        <div className="mt-5 grid gap-3">
          {portal.businesses.length ? (
            portal.businesses.map((business) => (
              <article key={business.id} className="rounded-md border border-line bg-white p-4">
                <h3 className="font-medium text-ink">{business.businessName}</h3>
                <div className="mt-3 grid gap-2 text-sm text-muted md:grid-cols-2">
                  <BusinessLine label="Status" value={business.status ?? "-"} />
                  <BusinessLine label="Website" value={business.websiteUrl ?? "-"} />
                  <BusinessLine label="Google review" value={business.googleReviewUrl ?? "-"} />
                  <BusinessLine label="Yelp" value={business.yelpUrl ?? "-"} />
                  <BusinessLine label="Facebook" value={business.facebookUrl ?? "-"} />
                  <BusinessLine label="Booking" value={business.bookingUrl ?? "-"} />
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-md border border-dashed border-line bg-soft p-5 text-sm text-muted">
              Business details will appear here after an order or hosted page is linked to this account.
            </div>
          )}
        </div>
      </section>
    </AccountShell>
  );
}

function BusinessLine({ label, value }: { label: string; value?: string }) {
  return (
    <p>
      <span className="text-ink">{label}:</span> {value ? <span className="break-all">{value}</span> : "-"}
    </p>
  );
}
