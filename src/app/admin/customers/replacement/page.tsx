import { AdminShell } from "@/components/admin/admin-shell";
import { ReplacementOrderForm, type ReplacementCustomer } from "@/components/admin/replacement-order-form";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminOrders } from "@/lib/orders";
import { canCreateReplacement } from "@/lib/replacement-orders";
import { formatOrderReference } from "@/lib/order-reference";

export default async function ReplacementOrderPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) {
  await requireAdmin();
  const requestedCustomer = (await searchParams).customer?.trim().toLowerCase();
  const { orders } = await getAdminOrders();
  const byCustomer = new Map<string, ReplacementCustomer>();
  for (const order of orders.filter(canCreateReplacement)) {
    const email = order.email!.toLowerCase();
    const customer = byCustomer.get(email) ?? { email, name: order.customer_name || email, orders: [] };
    customer.orders.push({ id: order.id!, reference: formatOrderReference(order.stripe_checkout_session_id || order.id), label: order.line_items_json.map((item) => item.title).join(", "), createdAt: order.created_at });
    byCustomer.set(email, customer);
  }
  const customers = Array.from(byCustomer.values()).sort((a, b) => a.name.localeCompare(b.name));
  return <AdminShell><section className="tr-admin-section"><a href="/admin/customers" className="text-sm font-semibold text-brand underline">Back to customers</a><h1 className="tr-admin-title mt-4">Replace a damaged stand</h1><p className="my-3 max-w-3xl text-sm text-muted">Creates a $0 replacement linked to the original customer order. It keeps the approved stand design and prepares a new production and shipping record.</p>{customers.length ? <ReplacementOrderForm customers={customers} selectedEmail={requestedCustomer} /> : <p className="mt-6 text-sm">No eligible customer orders are available for replacement.</p>}</section></AdminShell>;
}
