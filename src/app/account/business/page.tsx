import { AccountShell } from "@/components/account/account-shell";
import { requireCustomer } from "@/lib/customer-auth";
import { getHostedPageEditorContext } from "@/lib/hosted-page-editor";

export default async function AccountBusinessPage() {
  const session = await requireCustomer();
  const context = await getHostedPageEditorContext(session.email);
  const page = context.configured ? context.page : null;

  return (
    <AccountShell>
      <section className="tr-card max-w-2xl p-6">
        <p className="text-sm font-black uppercase text-brand">Account / Business</p>
        <h2 className="mt-2 text-2xl font-black text-ink">{page?.draft.businessName ?? "Hosted page account"}</h2>
        <div className="mt-5 grid gap-3 text-sm text-muted">
          <BusinessLine label="Login email" value={session.email} />
          <BusinessLine label="Permanent URL" value={page ? `https://taprater.com/p/${page.code}` : "-"} />
          <BusinessLine label="Page status" value={page?.lifecycleStatus ?? "-"} />
          <BusinessLine label="Last published" value={page?.publishedAt ?? "-"} />
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
