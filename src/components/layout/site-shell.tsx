"use client";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { usePathname } from "next/navigation";
import { PrismaticMotionProvider } from "@/components/prismatic/motion";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin") || (pathname.startsWith("/account") && !["/account/login", "/account/activate", "/account/forgot-password", "/account/reset-password"].includes(pathname))) {
    return <div className={`min-h-screen bg-soft ${pathname.startsWith("/account") ? "tr-prismatic-account" : ""}`}>{children}</div>;
  }

  const mobileTabs = !pathname.startsWith("/checkout") && !pathname.startsWith("/p/");
  return (
    <PrismaticMotionProvider><div className={`tr-public-shell min-h-screen ${!pathname.startsWith("/p/") ? "tr-prismatic-storefront" : ""} ${pathname.startsWith("/account") ? "tr-prismatic-account" : ""} ${mobileTabs ? "tr-with-mobile-tabs" : ""} ${pathname.startsWith("/product/") ? "tr-product-route" : ""}`}>
      <Header />
      <main className={pathname === "/" ? "tr-homepage" : undefined}>{children}</main>
      <Footer />
      {mobileTabs ? <MobileTabBar /> : null}
    </div></PrismaticMotionProvider>
  );
}
