import {AdminShell} from '@/components/admin/admin-shell';
import {WorkerHealth} from '@/components/admin/worker-health';
import {requireAdmin} from '@/lib/admin-auth';
import {adminWorkerHealth} from '@/lib/admin-worker-health';
export const dynamic='force-dynamic';
export default async function Page(){
 await requireAdmin();
 try {const data=await adminWorkerHealth();return <AdminShell><a className="tr-button-secondary m-4" href="/admin/client-failures">Client failures &amp; support alerts</a><WorkerHealth data={data}/></AdminShell>;}
 catch{return <AdminShell><h1 className="tr-admin-title">Workers & Health</h1><p role="alert">Health data is unavailable. Refresh to retry.</p></AdminShell>;}
}
