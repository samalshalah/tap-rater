import {MarketingAccessEditor} from './marketing-access-editor';
import {MarketingAccessSummary} from './marketing-access-summary';
import {adminLocationCosts} from '@/lib/admin-location-costs';
import {MonthlyComparison} from './monthly-comparison';
import {adminAiUsage} from '@/lib/admin-ai-usage';

import {AiUsageCost} from './ai-usage-cost';

import {serviceUsage} from '@/lib/admin-service-usage';



export const usageMoney=(micros:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:4,maximumFractionDigits:4}).format(micros/1e6);



export async function ServiceUsage() {

  let data:Awaited<ReturnType<typeof serviceUsage>>;

  try {data=await serviceUsage();}catch{return <section className="tr-admin-section"><h1 className="tr-admin-title">Service usage & costs</h1><p role="alert" className="mt-4">Usage data is temporarily unavailable. Missing data is not shown as zero.</p></section>;}

  const {accounts,budget}=data;

  let ai:Awaited<ReturnType<typeof adminAiUsage>>|null=null;

  try {ai=await adminAiUsage();}catch{/* Keep financial gaps explicit; never turn a ledger outage into zero cost. */}

  let locations:Awaited<ReturnType<typeof adminLocationCosts>>|null=null;
  try {locations=await adminLocationCosts();}catch{/* Missing costs remain unavailable. */}
  const comparison=locations?accounts.map(a=>({id:a.id,name:a.name,locations:locations!.filter(l=>l.accountId===a.id).map(l=>{
    const measured=ai?.accounts[a.id]?.locations.find(x=>x.id===l.id)?.totals;
    return {...l,ai:ai?(measured?.costNano??0):null,calls:measured?.calls??0,aiUnknown:measured?.unknown??0};
  })})):null;
  return <section className="tr-admin-section">

    <p className="tr-eyebrow">Client operations</p>

    <h1 className="tr-admin-title mt-1">Service usage & costs</h1>

    <p className="mt-2 text-sm text-muted">Account-level usage and internal provider costs. Customer content stays private. Customer pricing is inactive.</p>

    <MarketingAccessSummary/><MarketingAccessEditor/>
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

    <div className="mb-4 rounded-lg border border-line bg-white p-3 text-xs leading-5">

      <strong>AI cost tracking:</strong> {ai ? 'Measured token usage × saved provider rates, grouped by account and opaque location ID. Figures cover recorded calls in this calendar month (New York).' : 'The AI ledger is unavailable. Costs are unknown; heat-map reporting remains available.'}

      <p>Gross model cost is before Cloudflare’s shared free allowance, credits, and tax; final invoice allocation per client is not available. Calls before tracking began have no token history and cannot be reconstructed.</p>

      {ai?.ledgerCreatedAt&&<p>Ledger created: {new Date(ai.ledgerCreatedAt).toLocaleString('en-US',{timeZone:'America/New_York'})} (New York).</p>}

    </div>

    {comparison?<MonthlyComparison accounts={comparison} month={budget?.month||'Current month'}/>:<p role="alert" className="my-4">Location cost comparison unavailable. Missing data is not shown as zero.</p>}
    <div className="overflow-x-auto rounded-lg border border-line bg-white">

      <table className="w-full text-left text-sm">

        <caption className="sr-only">Per-client AI and heat-map usage, costs, and limits</caption>

        <thead className="bg-slate-50"><tr>{['Account','AI usage & limits','Heat-map usage','Heat-map access & limits','Our provider costs (USD)'].map(h=><th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead>

        <tbody>{accounts.map(a=><tr key={a.id} className="border-t border-line align-top">

          <td className="px-3 py-3 font-medium">{a.name}</td>

          <td className="px-3 py-3 leading-6">

            <div>Review AI: {a.reviewCalls} / {a.reviewLocations*20} in the last hour</div>

            <div>AI fixes: {a.fixCalls} / {a.fixLocations*10} today</div>

            {(a.sampleLocations>0||a.sampleCalls>0)&&<div>Sample AI: {a.sampleCalls} / {a.sampleLocations*20} today</div>}



          </td>

          <td className="px-3 py-3 leading-6"><div>{a.runs} scan runs</div><div>{a.points} points · {a.completed} complete</div><div>{a.queued} queued</div></td>

          <td className="px-3 py-3 leading-6"><div>{a.scheduledLocations} scheduled locations</div><div>4 scheduled windows / month / location</div><div>Extra scans: {a.manualLocations ? `${a.manualLocations} locations enabled`:'Disabled'}</div></td>

          <td className="px-3 py-3 leading-6"><div>Heat map: <strong>{usageMoney(a.knownCostMicros)}</strong></div><div>Reserved: {usageMoney(a.reservedMicros)}</div>{a.unconfirmedCosts>0&&<div className="text-amber-800">{a.unconfirmedCosts} point costs unconfirmed</div>}{ai?<AiUsageCost account={ai.accounts[a.id]}/>:<div>AI cost: Unavailable</div>}</td>

        </tr>)}</tbody>

      </table>

    </div>

    {!accounts.length&&<p className="mt-4">No client accounts yet.</p>}

    <div className="mt-3 grid gap-3 text-xs leading-5 text-muted lg:grid-cols-3">

      <p><strong>AI limits:</strong> 20 review requests per rolling hour and 10 fix requests daily per enabled location; sample AI has a separate 20-request daily limit. Allowances shown are totals, but cannot be pooled between locations. Zero means no eligible location.</p>

      <p><strong>Heat-map limits:</strong> Four scheduled windows per month per enabled location with active tracking. Extra scans require cost approval. There is no separate client spending cap; all accounts share the budget above. Scan usage counts runs created this month in New York time.</p>

      <p><strong>Cost coverage:</strong> Heat-map amounts are provider-reported subtotals for this budget month, before credits or tax. Unconfirmed costs are flagged separately. AI gross costs use provider-reported tokens. Missing usage, failed requests, and interrupted calls remain unknown, not $0.</p>

    </div>

    <p className="mt-3 text-xs leading-5 text-muted">AI counts are request attempts for {budget?.aiDay||'today'} (UTC), including failures. Daily quota counters reset; the new AI ledger retains recorded call and token history separately. Scan runs may contain multiple keywords; points are individual provider tasks. No customer charges or pricing changes are made here.</p>

  </section>;

}

