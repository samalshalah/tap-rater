import { AdminShell } from "@/components/admin/admin-shell";
import { ComplimentaryOrderForm } from "@/components/admin/complimentary-order-form";
import { requireAdmin } from "@/lib/admin-auth";
import { getStorefrontProducts } from "@/lib/product-repository";
import { complimentaryCatalog } from "@/lib/complimentary-orders";

export default async function NewComplimentaryOrderPage() {
  await requireAdmin();
  const catalog = complimentaryCatalog(await getStorefrontProducts()).map(({product, options}) => ({ slug: product.slug, title: product.title, options: options.map(o => ({id: o.id, label: o.label})) }));
  return <AdminShell><section className="tr-admin-section"><a href="/admin/orders" className="underline">Back to orders</a><h1 className="tr-admin-title mt-4">Create complimentary order</h1><p className="my-4 text-muted">Give a client an existing stand at no charge. No payment request or purchase email is sent. Branded artwork still requires approval before printing.</p><ComplimentaryOrderForm catalog={catalog} /></section></AdminShell>;
}
