import {neon} from '@neondatabase/serverless';
import {notFound} from 'next/navigation';
import {z} from 'zod';
import {AdminShell} from '@/components/admin/admin-shell';
import {requireAdmin} from '@/lib/admin-auth';
import {failureTitle} from '@/lib/admin-failure-notifications';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){
 await requireAdmin();const {id}=await params;if(!z.string().uuid().safeParse(id).success)notFound();
 const sql=neon(process.env.DATABASE_URL||process.env.NEON_DATABASE_URL!);
 const [issue]=await sql`SELECT f.*,c.email,b.business_name FROM client_failures f LEFT JOIN customers c ON c.id=f.customer_id LEFT JOIN businesses b ON b.id=f.business_id WHERE f.id=${id}::uuid`;
 if(!issue)notFound();
 const date=(value:string)=>new Date(value).toLocaleString('en-US',{timeZone:'America/New_York'});
 return <AdminShell><main className="p-4"><a href="/admin/client-failures" className="text-xs underline">← All client failures</a><h1 className="tr-admin-title mt-2">{failureTitle(issue.code)}</h1>
 <p className="mb-3 text-xs">{issue.email||'System / unidentified'} · {issue.business_name||'Account-wide'} · {issue.resolved_at?'Recovered':'Needs attention'}</p>
 <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded border border-line bg-white p-3 text-xs">
 <dt>Failure code</dt><dd>{issue.code}</dd><dt>Affected page</dt><dd>{issue.path}</dd><dt>Source / HTTP status</dt><dd>{issue.source} · {issue.http_status||'Not applicable'}</dd>
 <dt>First seen (Eastern)</dt><dd>{date(issue.first_seen)}</dd><dt>Last seen (Eastern)</dt><dd>{date(issue.last_seen)}</dd><dt>Occurrences</dt><dd>{issue.occurrences}</dd>
 <dt>Support email</dt><dd>{issue.notification_error||(issue.notified_at?'Accepted by email provider':'Pending')}</dd>
 {issue.resolved_at&&<><dt>Recovered (Eastern)</dt><dd>{date(issue.resolved_at)}</dd></>}
 </dl><div className="mt-3 flex gap-2"><a href="/admin/workers" className="tr-button-ghost">Workers &amp; Health</a><a href="/admin/customers" className="tr-button-ghost">Clients</a></div></main></AdminShell>;
}
