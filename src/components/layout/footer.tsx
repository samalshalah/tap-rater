"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FooterContent = {
  intro: string;
  columns: Array<{
    label: string;
    order: number;
    links: Array<{ label: string; href: string; order: number; enabled: boolean }>;
  }>;
};

const footerLinkOverrides: Record<string, { label?: string; href?: string }> = {
  "/category/website-link-stands|Multi-Link Stands": { label: "Website Link Stands" },
  "/solutions/auto-dealerships|Automotive": { href: "/solutions/automotive" },
  "/solutions/restaurants-cafes|Restaurants": { href: "/solutions/restaurant-food" },
  "/solutions/beauty-wellness|Beauty & Wellness": { href: "/solutions/beauty-salon-wellness" }
};

function normalizeFooterLink(link: FooterContent["columns"][number]["links"][number]) {
  const override = footerLinkOverrides[`${link.href}|${link.label}`];
  return override ? { ...link, ...override } : link;
}

const defaultFooterContent: FooterContent = {
  intro: "Custom NFC and QR tabletop stands for reviews, menus, booking, social media, feedback, and custom business links.",
  columns: [
    {
      label: "Shop",
      order: 10,
      links: [
        { label: "All Stands", href: "/shop", order: 10, enabled: true },
        { label: "Review Stands", href: "/category/reviews", order: 20, enabled: true },
        { label: "Menu Stands", href: "/category/menu", order: 30, enabled: true },
        { label: "Website Link Stands", href: "/category/website-link-stands", order: 40, enabled: true }
      ]
    },
    {
      label: "Solutions",
      order: 20,
      links: [
        { label: "Automotive", href: "/solutions/automotive", order: 10, enabled: true },
        { label: "Restaurants", href: "/solutions/restaurant-food", order: 20, enabled: true },
        { label: "Healthcare", href: "/solutions/healthcare-dental", order: 30, enabled: true },
        { label: "Beauty & Wellness", href: "/solutions/beauty-salon-wellness", order: 40, enabled: true }
      ]
    },
    {
      label: "Resources",
      order: 30,
      links: [
        { label: "How It Works", href: "/how-it-works", order: 10, enabled: true },
        { label: "FAQ", href: "/faqs", order: 20, enabled: true },
        { label: "Support", href: "/support", order: 30, enabled: true },
        { label: "Contact", href: "/contact-us", order: 40, enabled: true }
      ]
    },
    {
      label: "Company",
      order: 40,
      links: [
        { label: "Terms", href: "/terms", order: 10, enabled: true },
        { label: "Privacy", href: "/privacy-policy", order: 20, enabled: true },
        { label: "Refund Policy", href: "/refund-policy", order: 30, enabled: true },
        { label: "Shipping", href: "/shipping", order: 40, enabled: true }
      ]
    }
  ]
};

export function Footer() {
  const [content, setContent] = useState<FooterContent>(defaultFooterContent);
  const columns = useMemo(
    () => content.columns
      .slice()
      .sort((first, second) => first.order - second.order || first.label.localeCompare(second.label))
      .map((column) => ({
        ...column,
        links: column.links
          .filter((link) => link.enabled && link.href !== "/multi-link")
          .map(normalizeFooterLink)
          .sort((first, second) => first.order - second.order || first.label.localeCompare(second.label))
      })),
    [content]
  );

  useEffect(() => {
    let active = true;
    fetch("/api/site/website-content")
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (active && body?.footer?.columns) {
          setContent(body.footer);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  return (
    <footer className="border-t border-line bg-white text-ink">
      <div className="tr-container grid gap-8 py-12 md:grid-cols-[1.35fr_repeat(4,0.9fr)] lg:py-14">
        <div>
          <p className="text-lg font-semibold text-ink">Tap Rater</p>
          <p className="tr-body-sm mt-3 max-w-sm">
            {content.intro}
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.label} className="grid content-start gap-2 text-sm text-muted">
            <p className="tr-eyebrow mb-2 text-ink">{column.label}</p>
            {column.links.map((link) => (
              <Link key={`${column.label}-${link.href}-${link.label}`} href={link.href} className="min-h-8 transition hover:text-brand">
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="border-t border-line bg-white px-4 py-5 text-center text-xs text-muted">
        Copyright 2026 Tap Rater. All rights reserved.
      </div>
    </footer>
  );
}
