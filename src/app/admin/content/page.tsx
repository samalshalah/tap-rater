import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminContentPage() {
  await requireAdmin();

  return (
    <AdminShell>
      <section className="tr-admin-section">
      <p className="tr-eyebrow">Admin</p>
      <h1 className="tr-admin-title mt-3">Website</h1>
      <p className="mt-4 max-w-3xl leading-7 text-muted">
        Manage approved public website content inside Tap Rater's controlled visual system.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Link href="/admin/content/homepage" className="tr-admin-card p-5">
          <h2 className="font-semibold text-ink">Homepage, Navigation & FAQ</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Hero, action cards, sections, header, footer, and FAQ records.</p>
        </Link>
        <Link href="/admin/business-uses" className="tr-admin-card p-5">
          <h2 className="font-semibold text-ink">Use Cases</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Industries, imagery, SEO, ordering, and product relationships.</p>
        </Link>
        <Link href="/admin/content/pages" className="tr-admin-card p-5">
          <h2 className="font-semibold text-ink">Pages</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Draft and publish editable page content.</p>
        </Link>
        <Link href="/admin/products" className="tr-admin-card p-5">
          <h2 className="font-semibold text-ink">Products</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Edit product data, pricing, stock, and SEO.</p>
        </Link>
      </div>
      </section>
    </AdminShell>
  );
}
