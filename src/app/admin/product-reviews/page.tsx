import { requireAdmin } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductReviewsManager } from "@/components/admin/product-reviews-manager";

export const dynamic = "force-dynamic";
export default async function ProductReviewsAdminPage() {
  await requireAdmin();
  return <AdminShell><section className="tr-admin-section"><AdminPageHeader title="Product Reviews" description="Invite past customers, review their feedback, and publish genuine stand reviews and photos." /><ProductReviewsManager /></section></AdminShell>;
}
