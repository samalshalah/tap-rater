import {AdminNotifications} from './admin-notifications';
import {AdminSidebar} from '@/components/admin/admin-sidebar';
import {AdminRowExplorer} from '@/components/admin/admin-row-explorer';
import {PrismaticWave} from '@/components/prismatic/motion';
export function AdminShell({children}:{children:React.ReactNode}){
 return <div className="tr-admin-shell tr-admin-compact min-h-screen bg-soft lg:flex"><AdminSidebar/><div className="tr-admin-main min-w-0 flex-1"><header className="tr-admin-context"><span aria-hidden="true">▦</span><strong>Tap Rater administration</strong><span className="tr-admin-context-caption">Admin workspace</span><AdminNotifications/></header><div className="tr-admin-wave-banner"><PrismaticWave variant="banner" /></div><AdminRowExplorer>{children}</AdminRowExplorer></div></div>;
}
