"use client";

import Link from 'next/link';
import {LayoutDashboard,MessageSquare,Building2,Map, ListChecks,BarChart3,Bell,Tablet,Link2,ShoppingBag,UserRound} from 'lucide-react';
const icons=[LayoutDashboard,MessageSquare,Building2,Map,ListChecks,BarChart3,Bell,LayoutDashboard,Tablet,Link2,ShoppingBag,UserRound];
import {usePathname,useRouter} from 'next/navigation';
import {useEffect} from 'react';
import {customerNavigation, groupCustomerNavigation, isNavigationActive} from '@/lib/customer-navigation';

export function AccountNavigation({links}:{links:typeof customerNavigation}) {
  const pathname = usePathname();
  const router=useRouter();
  useEffect(()=>{
    let refreshed=0;
    const refreshAccess=()=>{if(document.visibilityState==='visible'&&Date.now()-refreshed>15000){refreshed=Date.now();router.refresh();}};
    window.addEventListener('focus',refreshAccess);
    document.addEventListener('visibilitychange',refreshAccess);
    return()=>{window.removeEventListener('focus',refreshAccess);document.removeEventListener('visibilitychange',refreshAccess);};
  },[router]);
  return <aside className="tr-workspace-sidebar">
    <Link href="/account" className="tr-client-brand"><img src="/uploads-optimized/brand/tap-rater-logo-w320.webp" alt="Tap Rater" width="140" height="48"/></Link>
    <nav aria-label="Account navigation" className="tr-account-navigation grid gap-4">
      {groupCustomerNavigation(links).map(section=><section key={section.id} aria-label={section.label}><h2 className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted">{section.label}</h2><div className="grid gap-1">
      {section.links.map((link) => {const Icon=icons[customerNavigation.findIndex(item=>item.href===link.href)];return <Link key={link.href} href={link.href}
        aria-current={isNavigationActive(pathname,link.href)?'page':undefined}
        className="tr-workspace-nav-link"><Icon size={17} aria-hidden="true"/>{link.label}</Link>;})}</div></section>)}
    </nav>
    <form action="/api/account/logout" method="post" className="mt-3">
      <button className="px-3 py-2 text-sm text-muted">Sign out</button>
    </form>
  </aside>;
}
