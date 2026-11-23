import {WorkspacePageHeader} from '@/components/account/workspace-ui';
import {customerStandRegistry,attachStandRegistry} from '@/lib/customer-stand-registry';
import { AccountShell } from "@/components/account/account-shell";
import { MultiLinkLicences } from "@/components/account/multilink-licences";
import { buildMultiLinkLicences } from "@/components/account/multilink-licence-model";
import { requireCustomer } from "@/lib/customer-auth";
import {getCustomerExperience} from '@/lib/customer-experience';
import {redirect} from 'next/navigation';
import { getHostedPageEditorContext } from "@/lib/hosted-page-editor";
import type {HostedPageEditorRecord} from '@/lib/hosted-page-editor-shared';
import {getSupabaseAdmin,hasSupabaseAdminConfig} from '@/lib/db';
import {readGrantedStand,type GrantedStand} from '@/lib/multilink-granted-stand';

// Stands chosen by Tap Rater when it granted a licence (no order behind them).
async function loadGrantedStands(codes:string[]):Promise<Record<string,GrantedStand>>{
  if(!codes.length||!hasSupabaseAdminConfig())return {};
  try{
    const {data}=await getSupabaseAdmin().from('hosted_page_codes').select('code,physical_product_ref').in('code',codes);
    const rows=(Array.isArray(data)?data:[]) as {code?:string;physical_product_ref?:string}[];
    return Object.fromEntries(rows.flatMap(row=>{const stand=readGrantedStand(row.physical_product_ref);return row.code&&stand?[[row.code,stand]]:[];}));
  }catch{return {};}
}

export default async function AccountMultiLinkPage({searchParams}:{searchParams?:Promise<{billing_error?:string}>}) {
  const params=await searchParams;
  const session = await requireCustomer();
  const {portal,multilink}=await getCustomerExperience(session.email);
  if(!multilink)redirect('/account');
  const codes=[...new Set(portal.subscriptions.map(subscription=>subscription.permanentCode.trim()).filter(Boolean))];
  const multiLinkStands=portal.stands.filter(stand=>stand.kind==='multilink');
  const registry=await customerStandRegistry(session.email);
  const stands=attachStandRegistry(multiLinkStands,[],registry);
  const [pageEntries,grantedStands]=await Promise.all([
    Promise.all(codes.map(async code=>{
      const context=await getHostedPageEditorContext(session.email,code);
      return context.configured&&context.page&&context.page.code===code?([code,context.page] as const):null;
    })),
    loadGrantedStands(codes)
  ]);
  const pages:Record<string,HostedPageEditorRecord>=Object.fromEntries(pageEntries.filter((entry):entry is NonNullable<typeof entry>=>Boolean(entry)));
  const licences=buildMultiLinkLicences({subscriptions:portal.subscriptions,stands,pages,grantedStands});

  return (
    <AccountShell>
      <div className="grid gap-5">
        <WorkspacePageHeader title="Multi-Link"/>
        <MultiLinkLicences licences={licences}/>
        {params?.billing_error&&<p role="alert" className="text-sm">{params.billing_error}</p>}
      </div>
    </AccountShell>
  );
}
