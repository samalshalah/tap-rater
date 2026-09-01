import { AccountShell } from "@/components/account/account-shell";
import { CustomerStandsManager } from "@/components/account/customer-stands-manager";
import { requireCustomer } from "@/lib/customer-auth";
import { getCustomerPortal } from "@/lib/customer-portal";
import { getHostedPageEditorContext } from "@/lib/hosted-page-editor";

export default async function AccountStandsPage() {
  const session = await requireCustomer();
  const portal = await getCustomerPortal(session.email);
  const hostedPageEntries = await Promise.all(
    portal.stands
      .filter((stand) => stand.kind === "multilink")
      .map(async (stand) => {
        const context = await getHostedPageEditorContext(session.email, stand.hostedPageCode);
        return context.configured && context.page ? ([stand.id, context.page] as const) : null;
      })
  );
  const hostedPages = Object.fromEntries(hostedPageEntries.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)));

  return (
    <AccountShell>
      <div className="grid gap-5">
        <section className="tr-card p-5">
          <p className="tr-eyebrow">My Stands</p>
          <h2 className="mt-2 text-xl font-medium text-ink">Purchased stands</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Manage each purchased stand after checkout. Multi-Link stands open a setup window for business details, logo, links, and landing page preview.
          </p>
        </section>

        <CustomerStandsManager stands={portal.stands} hostedPages={hostedPages} />
      </div>
    </AccountShell>
  );
}
