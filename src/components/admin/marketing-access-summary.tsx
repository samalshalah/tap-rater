import {liveDb} from '@/lib/google-business/live-reviews';
export async function MarketingAccessSummary(){
 let rows;
 try{rows=await liveDb()`SELECT coalesce(nullif(c.name,''),(SELECT b.business_name FROM businesses b WHERE b.customer_id=c.id ORDER BY b.id LIMIT 1),'Unnamed account') AS name,a.status,a.expires_at,r.requested_at FROM customers c LEFT JOIN customer_marketing_access a ON a.customer_id=c.id LEFT JOIN customer_marketing_requests r ON r.customer_id=c.id WHERE c.account_status='active' ORDER BY name`;}
 catch{return <p className="mt-4 text-sm">Package access status is temporarily unavailable.</p>;}
 return <details className="my-4 rounded-lg border border-line bg-white p-3"><summary className="cursor-pointer text-sm font-semibold">Reviews package access & requests</summary><div className="mt-3 overflow-auto"><table className="tr-workspace-table w-full text-left text-sm"><thead><tr><th>Account</th><th>Marketing access</th><th>Package request</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td>{r.name}</td><td>{r.expires_at&&Date.parse(r.expires_at)<=Date.now()?'Expired':r.status||'No package'}</td><td>{r.requested_at?'Requested '+new Date(r.requested_at).toLocaleDateString():'—'}</td></tr>)}</tbody></table></div><p className="mt-2 text-xs text-muted">The Reviews package includes every marketing tool. Requests do not activate access or billing.</p></details>;
}
