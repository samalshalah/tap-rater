import {liveDb} from '@/lib/google-business/live-reviews';
import {activeReviewWorkerAlerts} from '@/lib/review-worker-alerts';
export async function ReviewWorkerAlerts(){
 const rows=await activeReviewWorkerAlerts(liveDb());
 return <section className="tr-card mb-4 p-4"><h2 className="text-lg font-semibold">Review worker alerts</h2>{!rows.length?<p className="mt-2 text-sm text-muted">No active failures.</p>:<div className="overflow-auto"><table className="mt-3 w-full text-left text-sm"><thead><tr><th>Location ID</th><th>Task</th><th>Attempts</th><th>Last failure</th><th>Admin email</th></tr></thead><tbody>{rows.map(r=><tr key={r.business_id+':'+r.stage}><td className="py-2">{r.business_id}</td><td>{r.stage}</td><td>{r.failures}</td><td>{new Date(r.updated_at).toLocaleString('en-US',{timeZone:'America/New_York'})}</td><td>{r.emailed_at?'Sent':r.failures>=3?'Pending':'Retrying'}</td></tr>)}</tbody></table></div>}</section>;
}
