import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminStandTypes } from "@/lib/admin-stand-types";

export default async function AdminStandTypesPage() {
  await requireAdmin();
  const standTypes = await getAdminStandTypes();

  return (
    <AdminShell>
      <section className="tr-admin-section">
        <div>
          <p className="tr-eyebrow">Catalog</p>
          <h1 className="tr-admin-title mt-2">Stand Types</h1>
          <p className="mt-2 text-sm leading-6 text-muted">Manage category page content, buyer intent, SEO, images, visibility, and ordering.</p>
        </div>

        <div className="tr-admin-table-shell mt-8 overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-gray-50 text-xs uppercase text-muted">
                <th className="p-4">Title</th>
                <th className="p-4">Slug</th>
                <th className="p-4">Display order</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {standTypes.map((standType) => (
                <tr key={standType.slug} className="border-b border-line last:border-b-0">
                  <td className="p-4">
                    <p className="font-semibold text-ink">{standType.title}</p>
                    <p className="mt-1 line-clamp-2 text-muted">{standType.buyerIntent || standType.shortDescription || standType.description || "-"}</p>
                  </td>
                  <td className="p-4 font-mono text-xs text-muted">{standType.slug}</td>
                  <td className="p-4 text-muted">{standType.sortOrder}</td>
                  <td className="p-4"><StatusBadge active={standType.isActive} /></td>
                  <td className="p-4 text-right">
                    <Link href={`/admin/stand-types/${standType.slug}`} className="rounded-md border border-line px-3 py-2 text-xs font-bold text-ink hover:border-brand hover:text-brand">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {standTypes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted">No stand types yet.</td>
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
