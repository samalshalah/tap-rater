import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ReviewWorkspaces } from "@/components/account/review-workspaces";
import { googleAdminIdentity } from "@/lib/google-business/http";
import { listReviewWorkspaces } from "@/lib/review-workspaces";
export const dynamic = "force-dynamic";
export default async function WorkspacesPage() {
  if (!(await googleAdminIdentity())) redirect("/admin/login");
  const workspaces = await listReviewWorkspaces({ kind: "admin" });
  return <AdminShell><section className="tr-admin-section"><p className="tr-eyebrow mb-3">Customer workspaces · Admin</p><ReviewWorkspaces initialWorkspaces={workspaces} endpoint="/api/admin/review-workspaces" /></section></AdminShell>;
}
