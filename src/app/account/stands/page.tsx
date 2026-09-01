import { AccountShell } from "@/components/account/account-shell";
import { CustomerStandsManager } from "@/components/account/customer-stands-manager";
import { HostedPageEditor } from "@/components/account/hosted-page-editor";
import { requireCustomer } from "@/lib/customer-auth";
import { getCustomerPortal } from "@/lib/customer-portal";
import { getHostedPageEditorContext } from "@/lib/hosted-page-editor";

type AccountStandsPageProps = {
  searchParams?: Promise<{ code?: string }>;
};

export default async function AccountStandsPage({ searchParams }: AccountStandsPageProps) {
  const session = await requireCustomer();
  const params = await searchParams;
  const selectedCode = typeof params?.code === "string" ? params.code : undefined;
  const [portal, context] = await Promise.all([
    getCustomerPortal(session.email),
    getHostedPageEditorContext(session.email, selectedCode)
  ]);
  const multiLinkCount = portal.stands.filter((stand) => stand.kind === "multilink").length;
  const shouldShowHostedEditor = Boolean(context.configured && context.page);

  return (
    <AccountShell>
      <div className="grid gap-5">
        <section className="tr-card p-5">
          <p className="tr-eyebrow">My Stands</p>
          <h2 className="mt-2 text-xl font-medium text-ink">Purchased stands</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Manage each purchased stand after checkout. View status, confirm destination details, and edit hosted Multi-Link pages without rebuilding the original order.
          </p>
        </section>

        <CustomerStandsManager stands={portal.stands} />

        {multiLinkCount > 0 ? (
          <section id="multi-link-editor" className="tr-card p-5">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="tr-eyebrow">Multi-Link</p>
                <h2 className="mt-2 text-xl font-medium text-ink">Hosted page setup</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  Edit the links for the selected Multi-Link stand. The physical stand stays attached to the original order.
                </p>
              </div>
            </div>
            {shouldShowHostedEditor ? (
              <HostedPageEditor initialPage={context.page!} />
            ) : (
              <EmptyState message={context.configured ? "Select a Multi-Link stand above to manage its hosted page." : context.message} />
            )}
          </section>
        ) : null}
      </div>
    </AccountShell>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-md border border-dashed border-line bg-white p-5 text-sm text-muted">{message}</div>;
}
