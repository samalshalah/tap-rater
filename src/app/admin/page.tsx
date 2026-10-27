import { Suspense } from "react";
import { ClientOperations } from "@/components/admin/client-operations";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminStoreOperations } from "@/components/admin/admin-store-operations";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminPage() {
  await requireAdmin();
  return <AdminShell><ClientOperations/><Suspense fallback={<p role="status" className="mx-4 mb-4 text-sm text-muted">Loading store operations...</p>}><AdminStoreOperations/></Suspense></AdminShell>;
}
