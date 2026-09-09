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
      .filter((stand) => stand.kind === "multilink" && stand.hostedPageCode)
      .map(async (stand) => {
        const context = await getHostedPageEditorContext(session.email, stand.hostedPageCode);
        return context.configured && context.page && context.page.code === stand.hostedPageCode ? ([stand.id, context.page] as const) : null;
      })
  );
  const hostedPages = Object.fromEntries(hostedPageEntries.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)));

  return (
    <AccountShell>
      <div className="grid gap-5">
        <section className="tr-card p-5">
          <p className="tr-eyebrow">My Stands</p>
          <h2 className="mt-2 text-xl font-medium text-ink">Stand history</h2>
        </section>

        <CustomerStandsManager stands={portal.stands} hostedPages={hostedPages} />
      </div>
    </AccountShell>
  );
}
