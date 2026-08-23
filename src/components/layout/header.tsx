"use client";

import Link from "next/link";
import Image from "next/image";
import { CircleUserRound, Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";

const navItems = [
  { href: "/shop", label: "Shop" },
  { href: "/solutions", label: "Solutions" },
  { href: "/custom-stands", label: "Custom Stands" },
  { href: "/pricing", label: "Pricing" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/support", label: "Support" }
];

export function Header() {
  const cart = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className="tr-container-wide">
        <div className="grid min-h-14 grid-cols-[1fr_auto] items-center gap-3 lg:min-h-16 lg:grid-cols-[180px_1fr_180px]">
          <Link href="/" className="inline-flex items-center" onClick={() => setIsMenuOpen(false)}>
            <Image
              src="/uploads/brand/tap-rater-logo.png"
              alt="Tap Rater"
              width={110}
              height={66}
              priority
              className="h-9 w-auto object-contain"
            />
          </Link>
          <nav className="hidden justify-center gap-7 text-[13px] font-medium text-ink lg:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-brand">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-end gap-3 text-sm font-medium text-ink">
            <Link
              href="/admin"
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-transparent transition hover:border-line hover:text-brand sm:inline-flex"
              aria-label="Admin"
              onClick={() => setIsMenuOpen(false)}
            >
              <CircleUserRound size={18} />
            </Link>
            <Link
              href="/cart"
              aria-label="Cart"
              className="relative grid h-10 w-10 place-items-center rounded-full border border-transparent transition hover:border-line hover:text-brand"
              onClick={() => setIsMenuOpen(false)}
            >
              <ShoppingBag size={21} />
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-xs font-semibold text-white">
                {cart.count}
              </span>
            </Link>
            <button
              type="button"
              className="tr-icon-button lg:hidden"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((current) => !current)}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {isMenuOpen ? (
          <nav className="grid gap-1 border-t border-line py-3 text-sm font-semibold text-ink lg:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-3 hover:bg-soft hover:text-brand"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/cart"
              className="rounded-lg px-3 py-3 hover:bg-soft hover:text-brand"
              onClick={() => setIsMenuOpen(false)}
            >
              Cart
            </Link>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
