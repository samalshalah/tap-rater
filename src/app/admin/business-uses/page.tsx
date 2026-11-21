import { AdminPageHeader } from "@/components/admin/admin-page-header";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminBusinessUses } from "@/lib/admin-business-uses";

export default async function AdminBusinessUsesPage() {
  await requireAdmin();
  const businessUses = await getAdminBusinessUses();

  return (
    <AdminShell>
      <section className="tr-admin-section">
        <AdminPageHeader title="Business Uses" description="Shop by Use cards, landing content, SEO, images, order and assigned products." actions={<Link href="/admin/business-uses/new" className="tr-button-primary">Create business use</Link>} />

        <div className="tr-admin-table-shell mt-8 overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-gray-50 text-xs uppercase text-muted">
                <th className="p-4">Title</th>
                <th className="p-4">Slug</th>
                <th className="p-4">Products</th>
                <th className="p-4">Display order</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {businessUses.map((businessUse) => (
                <tr key={businessUse.slug} className="border-b border-line last:border-b-0">
                  <td className="p-4">
                    <p className="font-black text-ink">{businessUse.title}</p>
                    <p className="mt-1 line-clamp-2 text-muted">{businessUse.shortDescription || businessUse.description || "-"}</p>
                  </td>
                  <td className="p-4 font-mono text-xs text-muted">{businessUse.slug}</td>
                  <td className="p-4 text-muted">{businessUse.productSlugs.length}</td>
                  <td className="p-4 text-muted">{businessUse.sortOrder}</td>
                  <td className="p-4"><StatusBadge active={businessUse.isActive} /></td>
                  <td className="p-4 text-right">
                    <Link href={`/admin/business-uses/${businessUse.slug}`} className="rounded-md border border-line px-3 py-2 text-xs font-bold text-ink hover:border-brand hover:text-brand">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {businessUses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted">No business uses yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return <span className={active ? "rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase text-brand" : "rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase text-ink"}>{active ? "Active" : "Draft"}</span>;
}
