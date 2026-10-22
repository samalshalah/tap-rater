import type {AiUsageTotals} from '@/lib/admin-ai-usage';
export function aiCostMoney(nano:number){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:6,maximumFractionDigits:9}).format(nano/1e9);}
export function AiUsageCost({account}:{account?:{totals:AiUsageTotals;locations:{id:string;totals:AiUsageTotals}[]}}){
  if(!account)return <div>AI: No recorded calls</div>;
  const t=account.totals;
  return <div className="mt-2 border-t border-line pt-2">
    <div>AI gross: <strong>{t.measured?aiCostMoney(t.costNano):'No measured calls yet'}</strong></div>
    <div className="text-xs">{t.calls} recorded calls · {t.measured} measured</div>
    {t.unknown>0&&<div className="text-xs text-amber-800">{t.unknown} costs unknown / pending</div>}
    <details className="mt-1"><summary className="cursor-pointer text-xs font-semibold">AI usage by location</summary>
      <div className="mt-2 space-y-2">{account.locations.map(l=><div key={l.id} className="rounded border border-line p-2 text-xs leading-5">
        <div className="font-semibold">Location {l.id.slice(0,8)}</div>
        <div>{l.totals.calls} calls · {l.totals.input} input / {l.totals.output} output tokens</div>
        <div>Gross cost: {l.totals.measured?aiCostMoney(l.totals.costNano):'No measured calls'}</div>
        {l.totals.unknown>0&&<div>{l.totals.unknown} costs unknown / pending</div>}
      </div>)}</div>
    </details>
  </div>;
}
