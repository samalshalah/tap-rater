import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminDataTable, AdminLinkButton } from "@/components/admin/admin-ui";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminContentPage() {
  await requireAdmin();

  return (
    <AdminShell>
      <section className="tr-admin-section">
      <AdminPageHeader title="Website" description="Public website content: homepage, use cases and pages." />
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
