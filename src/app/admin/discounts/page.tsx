import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
export default async function DiscountsPage() { await requireAdmin(); redirect("/admin/offers"); }
