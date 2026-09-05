import type { Metadata, Viewport } from "next";
import { CartProvider } from "@/components/cart/cart-provider";
import { SiteShell } from "@/components/layout/site-shell";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getPublicSiteUrl()),
  title: {
    default: "Tap Rater | NFC and QR Stands for Local Businesses",
    template: "%s | Tap Rater"
  },
  description:
    "Tap Rater sells custom NFC and QR tabletop stands that help customers tap or scan to open review, menu, booking, social, feedback, website, or custom links.",
  keywords: [
    "Google review stand",
    "NFC review stand",
    "review us on Google sign",
    "NFC menu stand",
    "customer feedback NFC stand"
  ],
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Tap Rater | NFC and QR Stands for Local Businesses",
    description:
      "Custom NFC and QR tabletop stands that help customers open your important link with one tap or scan.",
    url: "/",
    siteName: "Tap Rater",
    type: "website"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <SiteShell>{children}</SiteShell>
        </CartProvider>
      </body>
    </html>
  );
}
