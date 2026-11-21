import {AdminHelp} from './admin-help';
import {AdminPageHeader} from './admin-page-header';
import {Users} from 'lucide-react';
import {clientOperations, type ClientOperation} from '@/lib/admin-client-operations';
import {ClientLicencesButton} from './marketing-access-editor';
import {AdminLinkButton} from './admin-ui';
import {CustomerActivationButton} from './customer-activation-button';

type View = 'all'|'accounts'|'usage'|'ai'|'google';
const titles:Record<View,string>={all:'Dashboard',accounts:'Customers',usage:'Service usage',ai:'AI Agent',google:'Google Connection'};
const descriptions:Record<View,string>={all:'Client accounts, Google connections and service usage at a glance, then store operations.',accounts:'Customer accounts, licences and replacement stands.',usage:'AI requests and heat-map scans per account.',ai:'Draft generation and AI requests per account.',google:'Google connections and review import status per account.'};
const columns:{label:string; views:View[]; value:(a:ClientOperation)=>string|number}[]=[
  {label:'Account',views:['accounts','usage','ai','google'],value:a=>a.accountName},
  {label:'Status',views:['accounts'],value:a=>a.status.replaceAll('_',' ')},
  {label:'Locations',views:['accounts','usage','ai','google'],value:a=>a.locations},
  {label:'Google connected',views:['google'],value:a=>`${a.connected} / ${a.locations}`},
  {label:'Import status',views:['google'],value:a=>a.syncAttention ? `${a.syncAttention} need attention` : a.connected ? 'No errors reported' : 'Not connected'},
  {label:'AI drafts enabled',views:['ai'],value:a=>`${a.aiLocations} ${a.aiLocations===1?'location':'locations'}`},
  {label:'AI calls today (UTC)',views:['ai','usage'],value:a=>a.aiCallsToday},
  {label:'Scans / points this month (UTC)',views:['usage'],value:a=>`${a.scansThisMonth} / ${a.scanPointsThisMonth}`},
];
export async function ClientOperations({view='all'}:{view?:View}={}) {
  const visibleColumns=columns.filter(c=>view==='all'||c.views.includes(view));
  let accounts:Awaited<ReturnType<typeof clientOperations>>=[];
  let unavailable=false;
  try {accounts=await clientOperations();} catch {unavailable=true;}
  return <section className="tr-admin-section">
    <AdminPageHeader title={titles[view]} description={descriptions[view]}
      actions={view==='accounts'?<AdminLinkButton href="/admin/customers/replacement" variant="primary">Create replacement stand</AdminLinkButton>:undefined}>
     <span className="tr-admin-page-help"><AdminHelp title={titles[view]}><p>{view==='accounts'?'Manage customers and their licences.':'Account status, Google connectivity, and service usage. Client reviews, drafts, profiles, listings, heat maps, and Google reports are private.'}</p><p className="mt-2">Usage counts requests, including attempts; it is not a billing statement. Replies and profile changes remain drafts. New pricing is not active.</p></AdminHelp></span>
    </AdminPageHeader>
    {unavailable ? <p role="alert" className="mt-4">Operational data is temporarily unavailable.</p> : <>
      {view!=='accounts'&&<div className="tr-admin-metrics my-4 flex flex-wrap gap-5 text-sm">
        <span><strong>{accounts.length}</strong> accounts</span>
        <span><strong>{accounts.reduce((n,a)=>n+a.locations,0)}</strong> locations</span>
        <span><strong>{accounts.reduce((n,a)=>n+a.connected,0)}</strong> Google connections</span>
      </div>}
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Client account operational status and service usage</caption>
          <thead className="bg-slate-50"><tr>{visibleColumns.map(c=><th key={c.label} className="px-3 py-3 font-semibold">{c.label}</th>)}{view==='accounts'&&<><th className="px-3 py-3">Replacement</th><th className="px-3 py-3">Licences</th></>}</tr></thead>
          <tbody>{accounts.map(a=><tr key={a.accountId} className="border-t border-line">
            {visibleColumns.map(c=><td key={c.label} className="px-3 py-3">{c.label==='Account'?<span className="tr-admin-row-identity"><Users aria-hidden="true"/>{c.value(a)}</span>:c.value(a)}</td>)}
            {view==='accounts'&&<><td className="px-3 py-3"><AdminLinkButton href={`/admin/customers/replacement?customer=${encodeURIComponent(a.email)}`} className="min-h-9 px-3 py-1.5 text-xs" variant="outline">Replace stand</AdminLinkButton></td><td className="px-3 py-3"><ClientLicencesButton customerId={a.accountId}/>{a.status==='pending_activation'&&<CustomerActivationButton customerId={a.accountId}/>}</td></>}
          </tr>)}</tbody>
        </table>
      </div>
      {!accounts.length&&<p className="mt-4 text-sm">No client accounts yet.</p>}

    </>}
  </section>;
}
