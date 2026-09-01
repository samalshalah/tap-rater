import Link from "next/link";
import { AccountShell } from "@/components/account/account-shell";
import { HostedPageEditor } from "@/components/account/hosted-page-editor";
import { requireCustomer } from "@/lib/customer-auth";
import { getCustomerPortal, type CustomerPortalStand } from "@/lib/customer-portal";
import { getHostedPageEditorContext } from "@/lib/hosted-page-editor";
import { formatOrderReference } from "@/lib/order-reference";

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

  return (
    <AccountShell>
      <div className="grid gap-5">
        <section className="tr-card p-5">
          <p className="tr-eyebrow">My Stands</p>
          <h2 className="mt-2 text-xl font-medium text-ink">Purchased stands</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Manage each physical stand separately. Orders stay in order history; this page is for setup, proof status, and Multi-Link management.
          </p>
        </section>

        <section className="grid gap-3">
          {portal.stands.length ? (
            portal.stands.map((stand) => <StandCard key={stand.id} stand={stand} />)
          ) : (
            <EmptyState message="No purchased stands are linked to this account yet." />
          )}
        </section>

        {multiLinkCount > 0 ? (
          <section id="multi-link-editor" className="tr-card p-5">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="tr-eyebrow">Multi-Link</p>
                <h2 className="mt-2 text-xl font-medium text-ink">Hosted page editor</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  Edit the active hosted page for this account. Additional Multi-Link pages will appear as separate stand cards when their hosted records are provisioned.
                </p>
              </div>
            </div>
            {context.configured && context.page ? <HostedPageEditor initialPage={context.page} /> : <EmptyState message={context.configured ? "No hosted editor page is ready yet." : context.message} />}
          </section>
        ) : null}
      </div>
    </AccountShell>
  );
}

function StandCard({ stand }: { stand: CustomerPortalStand }) {
  return (
    <article className="rounded-md border border-line bg-white p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-medium text-ink">{stand.title}</h3>
            {stand.quantity > 1 ? <span className="rounded-full bg-soft px-2 py-1 text-xs text-muted">Qty {stand.quantity}</span> : null}
            <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-medium text-brand">{formatKind(stand.kind)}</span>
          </div>
          <p className="mt-2 text-sm text-muted">Order {formatOrderReference(stand.orderReference)}</p>
          <div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
            <StatusPill label="Proof" value={formatProofStatus(stand.proofStatus)} />
            <StatusPill label="Production" value={formatStatus(stand.productionStatus)} />
            <StatusPill label="Shipping" value={formatStatus(stand.shippingStatus)} />
          </div>
          {stand.kind === "multilink" && stand.hostedPageUrl ? (
            <a href={stand.hostedPageUrl} target="_blank" rel="noreferrer" className="mt-3 block break-all text-sm text-brand">
              {stand.hostedPageUrl}
            </a>
          ) : null}
        </div>
        <Link href={stand.primaryActionHref} className="tr-button-primary shrink-0 self-start">
          {stand.primaryActionLabel}
        </Link>
      </div>
    </article>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <p className="rounded-md bg-soft px-3 py-2">
      <span className="block text-xs text-muted">{label}</span>
      <span className="mt-1 block capitalize text-ink">{value}</span>
    </p>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-md border border-dashed border-line bg-white p-5 text-sm text-muted">{message}</div>;
}

function formatKind(kind: CustomerPortalStand["kind"]) {
  if (kind === "multilink") return "Multi-Link";
  if (kind === "branded") return "Branded Direct";
  if (kind === "custom") return "Custom";
  return "Standard Direct";
}

function formatProofStatus(value: CustomerPortalStand["proofStatus"]) {
  if (value === "not_needed") return "Not needed";
  if (value === "approved") return "Approved";
  return "Needs review";
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}
