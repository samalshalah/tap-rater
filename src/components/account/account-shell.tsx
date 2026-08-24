import Link from "next/link";
import type { ReactNode } from "react";

const links = [
  { href: "/account", label: "My Page" },
  { href: "/account/business", label: "Account / Business" }
];

export function AccountShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-soft">
      <section className="tr-container tr-section-compact">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="tr-eyebrow">Tap Rater account</p>
            <h1 className="tr-page-title mt-2">My Tap Rater Page</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="tr-button-ghost">
                {link.label}
              </Link>
            ))}
            <form action="/api/account/logout" method="post">
              <button className="tr-button-ghost">Sign Out</button>
            </form>
          </nav>
        </div>
        {children}
      </section>
    </main>
  );
}
