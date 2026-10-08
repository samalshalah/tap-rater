"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, ShoppingCart, UserRound } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";

export function MobileTabBar() {
  const path = usePathname();
  const { count } = useCart();
  const active = path === "/" ? "Home" : path.startsWith("/account") ? "Account" : path.startsWith("/cart") ? "Cart" : /^\/(shop|product|category|custom-stands)/.test(path) ? "Shop" : "";
  return <nav className="tr-mobile-tabs" aria-label="Main mobile navigation">
    {[{ label: "Home", href: "/", icon: Home }, { label: "Shop", href: "/shop", icon: ShoppingBag }, { label: "Cart", href: "/cart", icon: ShoppingCart }, { label: "Account", href: "/account", icon: UserRound }].map(({ label, href, icon: Icon }) =>
      <Link key={href} href={href} prefetch={false} aria-current={active === label ? "page" : undefined} aria-label={label === "Cart" ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : label}>
        <span className="relative"><Icon size={24} aria-hidden="true" />{label === "Cart" && count > 0 ? <span className="tr-tab-count">{count > 99 ? "99+" : count}</span> : null}</span><span>{label}</span>
      </Link>)}
  </nav>;
}
