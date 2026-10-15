import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ComplimentaryOrderForm } from "@/components/admin/complimentary-order-form";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminOrderById } from "@/lib/orders";
import { getStorefrontProducts } from "@/lib/product-repository";
import { canChangeComplimentaryStand, complimentaryCatalog, complimentaryDesignSchema } from "@/lib/complimentary-orders";

export default async function EditStandPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { order } = await getAdminOrderById(id);
  if (!order) notFound();
  const catalog = complimentaryCatalog(await getStorefrontProducts()).map(({ product, options }) => ({ slug: product.slug, title: product.title, options: options.map(o => ({ id: o.id, label: o.label })) }));
  const item = order.line_items_json[0];
  const setup = item?.setup ?? {};
  const design = complimentaryDesignSchema.safeParse(setup);
  return <AdminShell><section className="tr-admin-section"><a href={`/admin/orders/${id}`} className="underline">Back to order</a><h1 className="tr-admin-title mt-4">Change stand</h1>
    <p className="my-4 text-muted">Choose another existing stand or adjust its design. The client, quantity and delivery details stay with this order. Branded artwork needs fresh approval after saving.</p>
    {canChangeComplimentaryStand(order) ? <ComplimentaryOrderForm catalog={catalog} initial={{ orderId: id, expectedUpdatedAt: order.updated_at!, productId: item.productId, optionId: item.optionId ?? "standard_direct", businessName: String(setup.businessName ?? ""), destinationUrl: String(setup.destinationUrl ?? ""), logoStorageKey: String(setup.logoStorageKey ?? item.logoReference ?? ""), quantity: item.quantity, design: design.success ? design.data : complimentaryDesignSchema.parse({}) }} /> : <p role="alert">Stand changes are available only for complimentary orders awaiting production and shipping.</p>}
  </section></AdminShell>;
}
