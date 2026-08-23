"use client";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { usePathname } from "next/navigation";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return <div className="min-h-screen bg-soft">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
