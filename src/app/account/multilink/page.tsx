import { AccountShell } from "@/components/account/account-shell";
import { CustomerStandsManager } from "@/components/account/customer-stands-manager";
import { requireCustomer } from "@/lib/customer-auth";
import {getCustomerExperience} from '@/lib/customer-experience';
import type {CustomerPortalStand} from "@/lib/customer-portal";
import {redirect} from 'next/navigation';
import { getHostedPageEditorContext } from "@/lib/hosted-page-editor";

export default async function AccountMultiLinkPage() {
  const session = await requireCustomer();
  const {portal,multilink}=await getCustomerExperience(session.email);
  if(!multilink)redirect('/account');
  const linkedCodes = new Set(portal.stands.map(stand=>stand.hostedPageCode).filter(Boolean));
  const linkedUrls = new Set(portal.stands.map(stand=>stand.hostedPageUrl).filter(Boolean));
  const allStands: CustomerPortalStand[] = [...portal.stands, ...portal.subscriptions.filter(page=>!linkedCodes.has(page.permanentCode)&&!linkedUrls.has(page.hostedPageUrl)).map(page=>({
    id: `page-${page.id}`, orderId: "", lineItemIndex: 0, orderReference: "", title: "Multi-Link page", quantity: 1,
    kind: "multilink" as const, hostedPageCode: page.permanentCode, hostedPageUrl: page.hostedPageUrl,
    multiLinkSetupPending: false, proofStatus: "not_needed" as const, productionStatus: "", shippingStatus: "",
    primaryActionLabel: "Manage links", primaryActionHref: "/account/stands"
  }))];
  const hostedPageEntries = await Promise.all(
    allStands
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
          <h1 className="text-xl font-semibold text-ink">Multi-Link</h1>
        </section>

        <CustomerStandsManager stands={allStands.filter(stand=>stand.kind==="multilink"&&portal.subscriptions.some(subscription=>subscription.permanentCode===stand.hostedPageCode))} hostedPages={hostedPages} />
      </div>
    </AccountShell>
  );
}
