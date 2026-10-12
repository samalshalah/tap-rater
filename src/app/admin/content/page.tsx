import { AdminDataTable, AdminLinkButton } from "@/components/admin/admin-ui";
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
      <div className="mt-4">
        <AdminDataTable caption="Website content" headers={["Section", "Contents", "Actions"]}>
          {[
            ["Homepage, Navigation & FAQ", "Hero, action cards, sections, header, footer, and FAQ records.", "/admin/content/homepage"],
            ["Use Cases", "Industries, imagery, SEO, ordering, and product relationships.", "/admin/business-uses"],
            ["Pages", "Draft and publish editable page content.", "/admin/content/pages"],
            ["Products", "Edit product data, pricing, stock, and SEO.", "/admin/products"]
          ].map(([title, description, href]) => <tr key={href}>
            <td className="font-semibold">{title}</td>
            <td className="text-muted">{description}</td>
            <td><div className="flex justify-end"><AdminLinkButton href={href}>Edit</AdminLinkButton></div></td>
          </tr>)}
        </AdminDataTable>
      </div>
      </section>
    </AdminShell>
  );
}
