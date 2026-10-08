"use client";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { usePathname } from "next/navigation";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return <div className="min-h-screen bg-soft">{children}</div>;
  }

  const mobileTabs = !pathname.startsWith("/checkout") && !pathname.startsWith("/p/");
  return (
    <div className={`tr-public-shell min-h-screen ${mobileTabs ? "tr-with-mobile-tabs" : ""} ${pathname.startsWith("/product/") ? "tr-product-route" : ""}`}>
      <Header />
      <main className={pathname === "/" ? "tr-homepage" : undefined}>{children}</main>
      <Footer />
      {mobileTabs ? <MobileTabBar /> : null}
    </div>
  );
}
