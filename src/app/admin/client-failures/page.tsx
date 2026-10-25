import {neon} from '@neondatabase/serverless';
import {AdminShell} from '@/components/admin/admin-shell';
import {requireAdmin} from '@/lib/admin-auth';
import {supportAlertRecipient} from '@/lib/client-failures';
export const dynamic='force-dynamic';
export default async function Page(){
 await requireAdmin();const sql=neon(process.env.DATABASE_URL!);
 const rows=await sql`SELECT f.*,c.email,b.business_name FROM client_failures f LEFT JOIN customers c ON c.id=f.customer_id LEFT JOIN businesses b ON b.id=f.business_id ORDER BY f.last_seen DESC LIMIT 200`;
 return <AdminShell><main className="p-4"><h1 className="tr-admin-title">Client failures</h1><p className="mb-3 text-xs text-muted">Support alerts: {supportAlertRecipient()} · Repeated failures are grouped; reminders at most once per day. Refresh to update.</p><a className="tr-button-secondary" href="/admin/workers">Workers &amp; Health</a><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{['Client / location','Failure','Last seen (New York)','Count','Support email'].map(t=><th className="border-b p-2" key={t}>{t}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td className="border-b p-2">{r.email||'System / unidentified'}<span aria-hidden="true"> · </span>{r.business_name||'Account-wide'}</td><td className="border-b p-2">{r.code} {r.resolved_at?'· Recovered':''}<span aria-hidden="true"> · </span>{r.path}</td><td className="border-b p-2">{new Date(r.last_seen).toLocaleString('en-US',{timeZone:'America/New_York'})}</td><td className="border-b p-2">{r.occurrences}</td><td className="border-b p-2">{r.notification_error|| (r.notified_at?'Accepted by email provider':'Pending')}</td></tr>)}</tbody></table>{!rows.length&&<p className="p-3">No failures recorded yet.</p>}</div></main></AdminShell>;
}
