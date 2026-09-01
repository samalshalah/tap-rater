import { AccountShell } from "@/components/account/account-shell";
import { requireCustomer } from "@/lib/customer-auth";
import { getCustomerPortal } from "@/lib/customer-portal";
import { getHostedPageEditorContext } from "@/lib/hosted-page-editor";

export default async function AccountBusinessPage() {
  const session = await requireCustomer();
  const [context, portal] = await Promise.all([
    getHostedPageEditorContext(session.email),
    getCustomerPortal(session.email)
  ]);
  const page = context.configured ? context.page : null;

  return (
    <AccountShell>
      <section className="tr-card p-6">
        <p className="tr-eyebrow">Business</p>
        <h2 className="mt-2 text-2xl font-black text-ink">{page?.draft.businessName ?? portal.businesses[0]?.businessName ?? "Business profile"}</h2>
        <div className="mt-5 grid gap-3 text-sm text-muted md:grid-cols-2">
          <BusinessLine label="Login email" value={session.email} />
          <BusinessLine label="Permanent URL" value={page ? `https://taprater.com/p/${page.code}` : "-"} />
          <BusinessLine label="Page status" value={page?.lifecycleStatus ?? "-"} />
          <BusinessLine label="Last published" value={page?.publishedAt ?? "-"} />
        </div>
      </section>
      <section className="tr-card mt-6 p-6">
        <p className="tr-eyebrow">Profiles</p>
        <h2 className="mt-2 text-2xl font-black text-ink">Saved business details</h2>
        <div className="mt-5 grid gap-3">
          {portal.businesses.length ? (
            portal.businesses.map((business) => (
              <article key={business.id} className="rounded-md border border-line bg-white p-4">
                <h3 className="font-black text-ink">{business.businessName}</h3>
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
            <div className="rounded-md border border-dashed border-line bg-soft p-5 text-sm font-semibold text-muted">
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
      <span className="font-bold text-ink">{label}:</span> {value ? <span className="break-all">{value}</span> : "-"}
    </p>
  );
}
