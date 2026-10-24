import {ReviewWorkerAlerts} from '@/components/admin/review-worker-alerts';
import {AdminShell} from '@/components/admin/admin-shell';
import {ClientOperations} from '@/components/admin/client-operations';
import {requireAdmin} from '@/lib/admin-auth';
export const dynamic='force-dynamic';
export default async function Page(){await requireAdmin();return <AdminShell><ReviewWorkerAlerts/><ClientOperations view="ai"/></AdminShell>;}
