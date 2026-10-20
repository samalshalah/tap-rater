import type { Metadata } from "next";
import { AccountShell } from "@/components/account/account-shell";
import { ReviewWorkspaces } from "@/components/account/review-workspaces";
import { requireCustomer } from "@/lib/customer-auth";
import { listReviewWorkspaces } from "@/lib/review-workspaces";
import { GoogleLiveReviews } from "@/components/account/google-live-reviews";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Review workspace", robots: { index: false, follow: false } };
export default async function ReviewsPage() {
  const customer = await requireCustomer();
  const workspaces = await listReviewWorkspaces({ kind: "customer", email: customer.email });
  return <AccountShell><GoogleLiveReviews /><ReviewWorkspaces initialWorkspaces={workspaces} endpoint="/api/account/reviews" /></AccountShell>;
}
