import {serviceUsage} from '@/lib/admin-service-usage';

export const usageMoney=(micros:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:4,maximumFractionDigits:4}).format(micros/1e6);

export async function ServiceUsage() {
  let data:Awaited<ReturnType<typeof serviceUsage>>;
  try {data=await serviceUsage();}catch{return <section className="tr-admin-section"><h1 className="tr-admin-title">Service usage & costs</h1><p role="alert" className="mt-4">Usage data is temporarily unavailable. Missing data is not shown as zero.</p></section>;}
  const {accounts,budget}=data;
  return <section className="tr-admin-section">
    <p className="tr-eyebrow">Client operations</p>
    <h1 className="tr-admin-title mt-1">Service usage & costs</h1>
    <p className="mt-2 text-sm text-muted">Account-level usage and internal provider costs. Customer content stays private. Customer pricing is inactive.</p>
    <div className="my-4 rounded-lg border border-line bg-white p-4 text-sm">
      <h2 className="font-semibold">Shared heat-map budget · {budget?.month||'Unavailable'} (New York)</h2>
      {budget?<div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
        <span>Monthly cap <strong>{usageMoney(budget.capMicros)}</strong></span>
        <span>Reserved <strong>{usageMoney(budget.reservedMicros)}</strong></span>
        <span>Available <strong>{usageMoney(budget.remainingMicros)}</strong></span>
        <span>Provider: <strong>{budget.halted?'Halted':budget.enabled?'Enabled':'Disabled'}</strong></span>
      </div>:<p className="mt-2">Budget configuration unavailable. No cap is assumed.</p>}
      <p className="mt-2 text-xs text-muted">This cap is shared across all accounts. Reservations include confirmed charges and unconfirmed submissions; do not add them to provider costs.</p>
    </div>
    <div className="overflow-x-auto rounded-lg border border-line bg-white">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Per-client AI and heat-map usage, costs, and limits</caption>
        <thead className="bg-slate-50"><tr>{['Account','AI usage & limits','Heat-map usage','Heat-map access & limits','Our provider costs (USD)'].map(h=><th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{accounts.map(a=><tr key={a.id} className="border-t border-line align-top">
          <td className="px-3 py-3 font-medium">{a.name}</td>
          <td className="px-3 py-3 leading-6">
            <div>Review AI: {a.reviewCalls} / {a.reviewLocations*20} today</div>
            <div>AI fixes: {a.fixCalls} / {a.fixLocations*10} today</div>
            {(a.sampleLocations>0||a.sampleCalls>0)&&<div>Sample AI: {a.sampleCalls} / {a.sampleLocations*20} today</div>}
            
          </td>
          <td className="px-3 py-3 leading-6"><div>{a.runs} scan runs</div><div>{a.points} points · {a.completed} complete</div><div>{a.queued} queued</div></td>
          <td className="px-3 py-3 leading-6"><div>{a.scheduledLocations} scheduled locations</div><div>4 scheduled windows / month / location</div><div>Extra scans: {a.manualLocations ? `${a.manualLocations} locations enabled`:'Disabled'}</div></td>
          <td className="px-3 py-3 leading-6"><div>Heat map: <strong>{usageMoney(a.knownCostMicros)}</strong></div><div>Reserved: {usageMoney(a.reservedMicros)}</div>{a.unconfirmedCosts>0&&<div className="text-amber-800">{a.unconfirmedCosts} point costs unconfirmed</div>}<div>AI: <strong>Not metered</strong></div></td>
        </tr>)}</tbody>
      </table>
    </div>
    {!accounts.length&&<p className="mt-4">No client accounts yet.</p>}
    <div className="mt-3 grid gap-3 text-xs leading-5 text-muted lg:grid-cols-3">
      <p><strong>AI limits:</strong> 20 review requests and 10 fix requests daily per enabled location; sample AI has a separate 20-request daily limit. Allowances shown are totals, but cannot be pooled between locations. Zero means no eligible location.</p>
      <p><strong>Heat-map limits:</strong> Four scheduled windows per month per enabled location with active tracking. Extra scans require cost approval. There is no separate client spending cap; all accounts share the budget above. Scan usage counts runs created this month in New York time.</p>
      <p><strong>Cost coverage:</strong> Heat-map amounts are provider-reported subtotals for this budget month, before credits or tax. Unconfirmed costs are flagged separately. AI cost is not metered and is unknown, not $0.</p>
    </div>
    <p className="mt-3 text-xs leading-5 text-muted">AI counts are request attempts for {budget?.aiDay||'today'} (UTC), including failures. Daily counters reset and do not provide monthly history or token charges. Scan runs may contain multiple keywords; points are individual provider tasks. No customer charges or pricing changes are made here.</p>
  </section>;
}
