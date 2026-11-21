"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { adminNavigationGroups } from "@/lib/admin-navigation";

/** The sidebar group a path belongs to, using the longest matching menu link. */
export function adminSectionFor(pathname: string) {
  let best: { group: string; length: number } | null = null;
  for (const group of adminNavigationGroups) {
    for (const item of group.items) {
      const href = item.href.split("?")[0];
      const matches = href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
      if (matches && (!best || href.length > best.length)) best = { group: group.label, length: href.length };
    }
  }
  return best?.group ?? null;
}

/**
 * The one header every admin page uses: the sidebar section, the title, one short description,
 * and the page's buttons on the right. Detail pages pass `back` to link to their list.
 */
export function AdminPageHeader({ title, description, actions, back, section, children }: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  /** Overrides the section label worked out from the URL. */
  section?: string | null;
  /** Small extras under the description, such as a status badge. */
  children?: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const label = section === undefined ? adminSectionFor(pathname) : section;
  const showLabel = label && label !== title;
  return (
    <header className="tr-admin-page-header">
      {back ? <Link href={back.href} className="tr-admin-page-back">← {back.label}</Link> : null}
      <div className="tr-admin-page-header-row">
        <div className="min-w-0">
          {showLabel ? <p className="tr-admin-page-section">{label}</p> : null}
          <h1 className="tr-admin-title">{title}</h1>
          {description ? <p className="tr-admin-page-description">{description}</p> : null}
          {children}
        </div>
        {actions ? <div className="tr-admin-page-actions">{actions}</div> : null}
      </div>
    </header>
  );
}
