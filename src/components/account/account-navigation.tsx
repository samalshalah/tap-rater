"use client";

import Link from 'next/link';
import {LayoutDashboard,MessageSquare,Building2,Map, ListChecks,BarChart3,Bell,Tablet,Link2,ShoppingBag} from 'lucide-react';
const icons=[LayoutDashboard,MessageSquare,Building2,Map,ListChecks,BarChart3,Bell,Tablet,Link2,ShoppingBag];
import {usePathname} from 'next/navigation';
import {customerNavigation, isNavigationActive} from '@/lib/customer-navigation';

export function AccountNavigation({links}:{links:typeof customerNavigation}) {
  const pathname = usePathname();
  return <aside className="tr-workspace-sidebar">
    <Link href="/account" className="tr-client-brand"><img src="/uploads-optimized/brand/tap-rater-logo-w320.webp" alt="Tap Rater" width="140" height="48"/></Link>
    <nav aria-label="Account navigation" className="flex gap-1 overflow-x-auto lg:grid">
      {links.map((link) => {const Icon=icons[customerNavigation.findIndex(item=>item.href===link.href)];return <Link key={link.href} href={link.href}
        aria-current={isNavigationActive(pathname,link.href)?'page':undefined}
        className="tr-workspace-nav-link"><Icon size={17} aria-hidden="true"/>{link.label}</Link>;})}
    </nav>
    <form action="/api/account/logout" method="post" className="mt-3">
      <button className="px-3 py-2 text-sm text-muted">Sign out</button>
    </form>
  </aside>;
}
