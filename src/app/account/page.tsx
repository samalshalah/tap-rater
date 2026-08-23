import { AccountShell } from "@/components/account/account-shell";
import { HostedPageEditor } from "@/components/account/hosted-page-editor";
import { requireCustomer } from "@/lib/customer-auth";
import { getHostedPageEditorContext } from "@/lib/hosted-page-editor";

export default async function AccountPage() {
  const session = await requireCustomer();
  const context = await getHostedPageEditorContext(session.email);

  return (
    <AccountShell>
      {!context.configured ? <PortalMessage message={context.message} /> : null}
      {context.configured && !context.page ? <PortalMessage message={context.message ?? "No hosted page was found for this account."} /> : null}
      {context.configured && context.page ? <HostedPageEditor initialPage={context.page} /> : null}
    </AccountShell>
  );
}

function PortalMessage({ message }: { message: string }) {
  return <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-ink">{message}</div>;
}
