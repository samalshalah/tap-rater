import {AdminShell} from '@/components/admin/admin-shell';
import {LocalDashboard} from '@/components/account/local-dashboard';
import {requireAdmin} from '@/lib/admin-auth';
export const dynamic='force-dynamic';
export default async function Page(){await requireAdmin();return <AdminShell><LocalDashboard admin/></AdminShell>;}
