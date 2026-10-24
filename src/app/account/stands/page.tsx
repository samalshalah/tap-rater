import {customerStandRegistry,attachStandRegistry} from '@/lib/customer-stand-registry';
import { AccountShell } from "@/components/account/account-shell";
import { CustomerStandsManager } from "@/components/account/customer-stands-manager";
import { requireCustomer } from "@/lib/customer-auth";
import {getCustomerExperience} from '@/lib/customer-experience';
import type {CustomerPortalStand} from "@/lib/customer-portal";
import {redirect} from 'next/navigation';
import { getHostedPageEditorContext } from "@/lib/hosted-page-editor";

export default async function AccountStandsPage() {
  const session = await requireCustomer();
  const {portal,service,stands}=await getCustomerExperience(session.email);
  if(service&&!stands)redirect('/account');
  const linkedCodes = new Set(portal.stands.map(stand=>stand.hostedPageCode).filter(Boolean));
  const linkedUrls = new Set(portal.stands.map(stand=>stand.hostedPageUrl).filter(Boolean));
  const allStands: CustomerPortalStand[] = [...portal.stands, ...portal.subscriptions.filter(page=>!linkedCodes.has(page.permanentCode)&&!linkedUrls.has(page.hostedPageUrl)).map(page=>({
    id: `page-${page.id}`, orderId: "", lineItemIndex: 0, orderReference: "", title: "Multi-Link page", quantity: 1,
    kind: "multilink" as const, hostedPageCode: page.permanentCode, hostedPageUrl: page.hostedPageUrl,
    multiLinkSetupPending: false, proofStatus: "not_needed" as const, productionStatus: "", shippingStatus: "",
    primaryActionLabel: "Manage links", primaryActionHref: "/account/stands"
  }))];
  const registry=await customerStandRegistry(session.email);
  const registeredStands=attachStandRegistry(allStands,portal.devices,registry);
  const hostedPageEntries = await Promise.all(
    registeredStands
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
        <section className="tr-account-page-header">
          <h1 className="text-xl font-semibold text-ink">My Stands</h1>
        </section>

        <CustomerStandsManager stands={registeredStands} hostedPages={hostedPages} businesses={portal.businesses.map(b=>({id:b.id,name:b.businessName}))} />
      </div>
    </AccountShell>
  );
}
