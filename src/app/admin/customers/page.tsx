import { AdminShell } from "@/components/admin/admin-shell";
import {
  AdminAlert,
  AdminBadge,
  AdminCard,
  AdminLinkButton,
  AdminSummaryCard,
} from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminCustomers } from "@/lib/admin-customers";
import { formatPrice } from "@/lib/products";

export default async function AdminCustomersPage() {
  await requireAdmin();
  const result = await getAdminCustomers();
  const customers = result.customers;
  const activeAccounts = customers.filter(
    (customer) => customer.accountStatus === "active",
  ).length;
  const activeSubscriptions = customers.reduce(
    (total, customer) => total + customer.activeSubscriptionCount,
    0,
  );

  return (
    <AdminShell>
      <section className="tr-admin-section">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="tr-eyebrow">Operations</p>
            <h1 className="tr-admin-title mt-2">Customers</h1>
            <p className="tr-body mt-3 max-w-3xl">
              Account, order, business, and Multi-Link activity in one support view.
            </p>
          </div>
          <AdminLinkButton href="/admin/orders" variant="secondary">
            View orders
          </AdminLinkButton>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <AdminSummaryCard
            label="Customer records"
            value={customers.length.toLocaleString()}
            description="Accounts and guest purchasers"
          />
          <AdminSummaryCard
            label="Active accounts"
            value={activeAccounts.toLocaleString()}
            description="Customers who can sign in"
          />
          <AdminSummaryCard
            label="Active Multi-Link"
            value={activeSubscriptions.toLocaleString()}
            description="Active or trialing subscriptions"
          />
        </div>

        {!result.configured ? (
          <AdminAlert tone="warning" className="mt-5">
            Customer data is unavailable because the database is not configured.
          </AdminAlert>
        ) : null}

        <AdminCard
          title="Customer directory"
          description="Guest orders are grouped by email so support can find every purchaser."
          className="mt-5 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase text-muted">
                  <th className="pb-3 pr-4 font-semibold">Customer</th>
                  <th className="pb-3 pr-4 font-semibold">Business</th>
                  <th className="pb-3 pr-4 font-semibold">Account</th>
                  <th className="pb-3 pr-4 font-semibold">Orders</th>
                  <th className="pb-3 pr-4 font-semibold">Paid total</th>
                  <th className="pb-3 font-semibold">Multi-Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="py-3 pr-4">
                      <strong className="block font-semibold text-ink">{customer.name || customer.email}</strong>
                      <span className="mt-1 block text-muted">{customer.email}</span>
                      {customer.phone ? (
                        <span className="mt-1 block text-muted">{customer.phone}</span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 text-muted">
                      {customer.businessNames.length > 0
                        ? customer.businessNames.join(", ")
                        : "-"}
                    </td>
                    <td className="py-3 pr-4">
                      <AdminBadge
                        tone={
                          customer.accountStatus === "active"
                            ? "success"
                            : customer.accountStatus === "guest"
                              ? "neutral"
                              : "warning"
                        }
                      >
                        {customer.accountStatus === "active"
                          ? "Active"
                          : customer.accountStatus === "guest"
                            ? "Guest"
                            : "Pending"}
                      </AdminBadge>
                    </td>
                    <td className="py-3 pr-4 text-ink">{customer.orderCount.toLocaleString()}</td>
                    <td className="py-3 pr-4 font-semibold text-ink">{formatPrice(customer.paidTotalCents)}</td>
                    <td className="py-3">
                      {customer.activeSubscriptionCount > 0 ? (
                        <AdminBadge tone="success">
                          {customer.activeSubscriptionCount} active
                        </AdminBadge>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
                {customers.length === 0 ? (
                  <tr>
                    <td className="py-8 text-center text-muted" colSpan={6}>No customer or order records yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </section>
    </AdminShell>
  );
}
