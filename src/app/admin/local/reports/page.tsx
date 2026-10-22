import {redirect} from 'next/navigation';
import {requireAdmin} from '@/lib/admin-auth';
export default async function Page(){await requireAdmin();redirect('/admin/usage');}
