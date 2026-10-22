import {AdminShell} from '@/components/admin/admin-shell';
import {ServiceUsage} from '@/components/admin/service-usage';
import {requireAdmin} from '@/lib/admin-auth';
export const dynamic='force-dynamic';
export default async function Page(){await requireAdmin();return <AdminShell><ServiceUsage/></AdminShell>;}
