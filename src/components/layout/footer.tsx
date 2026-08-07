import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="text-xl font-bold">Tap Rater</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-gray-300">
            Custom printed NFC and QR tabletop stands for local businesses.
          </p>
          <p className="mt-5 text-sm font-semibold text-accent">Built for reviews, menus, booking, social media, feedback, and custom business links.</p>
        </div>
        <div className="grid content-start gap-2 text-sm text-gray-300">
          <p className="mb-2 font-bold text-white">Shop</p>
          <Link href="/shop">All stands</Link>
          <Link href="/category/reviews">Review stands</Link>
          <Link href="/category/menu">Menu & info stands</Link>
          <Link href="/custom-stands">Custom stands</Link>
        </div>
        <div className="grid content-start gap-2 text-sm text-gray-300">
          <p className="mb-2 font-bold text-white">Support</p>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/support">Support</Link>
          <Link href="/change-taprater-link">Change Tap Rater link</Link>
        </div>
        <div className="grid content-start gap-2 text-sm text-gray-300">
          <p className="mb-2 font-bold text-white">Company</p>
          <Link href="/solutions">Solutions</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/faqs">FAQs</Link>
          <Link href="/privacy-policy">Privacy Policy</Link>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-gray-400">
        Copyright 2026 Tap Rater. All rights reserved.
      </div>
    </footer>
  );
}
