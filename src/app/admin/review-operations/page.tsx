import {AdminShell} from '@/components/admin/admin-shell';
import {ReviewOperations} from '@/components/admin/review-operations';
import {requireAdmin} from '@/lib/admin-auth';
import {adminWorkerHealth} from '@/lib/admin-worker-health';

export const dynamic='force-dynamic';

export default async function Page(){
 await requireAdmin();
 try{return <AdminShell><ReviewOperations data={await adminWorkerHealth()}/></AdminShell>;}
 catch{return <AdminShell><section className="tr-admin-section"><h1 className="tr-admin-title">Review Operations</h1><p role="alert" className="mt-2 text-sm text-red-700">Review queue data is unavailable. Refresh to retry.</p></section></AdminShell>;}
}
