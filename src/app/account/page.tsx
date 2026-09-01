import { AccountShell } from "@/components/account/account-shell";
import { HostedPageEditor } from "@/components/account/hosted-page-editor";
import { requireCustomer } from "@/lib/customer-auth";
import { getCustomerPortal } from "@/lib/customer-portal";
import { getHostedPageEditorContext } from "@/lib/hosted-page-editor";

export default async function AccountPage() {
  const session = await requireCustomer();
  const [context, portal] = await Promise.all([
    getHostedPageEditorContext(session.email),
    getCustomerPortal(session.email)
  ]);

  return (
    <AccountShell>
      {!context.configured ? <PortalMessage message={context.message} /> : null}
      {context.configured && !context.page ? <CustomerAccountSummary email={session.email} businessNames={portal.businesses.map((business) => business.businessName)} /> : null}
      {context.configured && context.page ? <HostedPageEditor initialPage={context.page} /> : null}
    </AccountShell>
  );
}

function PortalMessage({ message }: { message: string }) {
  return <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-ink">{message}</div>;
}

function CustomerAccountSummary({ email, businessNames }: { email: string; businessNames: string[] }) {
  return (
    <div className="grid gap-4">
      <section className="tr-card p-6">
        <p className="tr-eyebrow">Account</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">Your Tap Rater order is in review</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Tap Rater will use this account for proof review, order updates, and future service access. Multi-Link editing appears here when a hosted page is included with the order.
        </p>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-md border border-line bg-soft p-3">
            <dt className="font-semibold text-muted">Email</dt>
            <dd className="mt-1 font-semibold text-ink">{email}</dd>
          </div>
          <div className="rounded-md border border-line bg-soft p-3">
            <dt className="font-semibold text-muted">Businesses</dt>
            <dd className="mt-1 font-semibold text-ink">{businessNames.length ? businessNames.join(", ") : "Setup in review"}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
