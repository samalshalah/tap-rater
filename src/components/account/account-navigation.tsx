"use client";

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {customerNavigation, isNavigationActive} from '@/lib/customer-navigation';

export function AccountNavigation() {
  const pathname = usePathname();
  return <aside className="tr-workspace-sidebar">
    <Link href="/account" className="mb-4 block text-sm font-semibold">Customer workspace</Link>
    <nav aria-label="Account navigation" className="flex gap-1 overflow-x-auto lg:grid">
      {customerNavigation.map(link => <Link key={link.href} href={link.href}
        aria-current={isNavigationActive(pathname,link.href)?'page':undefined}
        className="tr-workspace-nav-link">{link.label}</Link>)}
    </nav>
    <form action="/api/account/logout" method="post" className="mt-3">
      <button className="px-3 py-2 text-sm text-muted">Sign out</button>
    </form>
  </aside>;
}
