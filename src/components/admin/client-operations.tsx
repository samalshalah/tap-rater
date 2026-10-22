import {clientOperations} from '@/lib/admin-client-operations';

export async function ClientOperations() {
  let accounts:Awaited<ReturnType<typeof clientOperations>>=[];
  let unavailable=false;
  try {accounts=await clientOperations();} catch {unavailable=true;}
  return <section className="tr-admin-section">
    <p className="tr-eyebrow">Client operations</p>
    <h1 className="tr-admin-title mt-1">Accounts & service usage</h1>
    <p className="mt-2 text-sm text-muted">Account status, Google connectivity, and service usage. Client reviews, drafts, profiles, listings, heat maps, and Google reports are private.</p>
    {unavailable ? <p role="alert" className="mt-4">Operational data is temporarily unavailable.</p> : <>
      <div className="my-4 flex flex-wrap gap-5 text-sm">
        <span><strong>{accounts.length}</strong> accounts</span>
        <span><strong>{accounts.reduce((n,a)=>n+a.locations,0)}</strong> locations</span>
        <span><strong>{accounts.reduce((n,a)=>n+a.connected,0)}</strong> Google connections</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Client account operational status and service usage</caption>
          <thead className="bg-slate-50"><tr>{['Account','Status','Locations','Google connected','Import status','AI drafts enabled','AI calls today (UTC)','Scans / points this month (UTC)'].map(h=><th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody>{accounts.map(a=><tr key={a.accountId} className="border-t border-line">
            <td className="px-3 py-3 font-medium">{a.accountName}</td><td className="px-3 py-3">{a.status}</td>
            <td className="px-3 py-3">{a.locations}</td><td className="px-3 py-3">{a.connected} / {a.locations}</td>
            <td className="px-3 py-3">{a.syncAttention ? `${a.syncAttention} need attention` : a.connected ? 'No errors reported' : 'Not connected'}</td>
            <td className="px-3 py-3">{a.aiLocations} locations</td><td className="px-3 py-3">{a.aiCallsToday}</td>
            <td className="px-3 py-3">{a.scansThisMonth} / {a.scanPointsThisMonth}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {!accounts.length&&<p className="mt-4 text-sm">No client accounts yet.</p>}
      <p className="mt-3 text-xs text-muted">Usage counts requests, including attempts; it is not a billing statement. Replies and profile changes remain drafts. New pricing is not active.</p>
    </>}
  </section>;
}
