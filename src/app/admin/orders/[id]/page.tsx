import {orderStandRegistry} from "@/lib/customer-stand-registry";
import { EmailDeliveryHistory } from "@/components/admin/email-delivery-history";
import { getAdminEmailDeliveries } from "@/lib/email-deliveries";
import { canChangeComplimentaryStand } from "@/lib/complimentary-orders";
import { OrderCustomerEmail } from "@/components/admin/order-customer-email";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminAlert, AdminLinkButton } from "@/components/admin/admin-ui";
import { OrderFulfillmentForm } from "@/components/admin/order-fulfillment-form";
import { OrderProductionActions } from "@/components/admin/order-production-actions";
import { OrderRefundForm } from "@/components/admin/order-refund-form";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { canRunOrderProductionActions } from "@/lib/order-fulfillment-rules";
import { getAdminOrderById, getAdminOrderArtworkUrl, getOrderLineItemProductionSummary, getOrderProductionBlockers } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { formatOrderReference } from "@/lib/order-reference";
import { InfoCard, OrderAttentionCard, Field, AddressBlock, LineItemDetail, readNested, formatPaymentStatus, buildAttentionItems } from "@/components/admin/order-detail-components";

type AdminOrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  await requireAdmin();
  const { id } = await params;
  const { configured, order } = await getAdminOrderById(id);

  if (!configured || !order) {
    notFound();
  }

  const [standRecords, deliveryOverview] = await Promise.all([
    orderStandRegistry(id),
    getAdminEmailDeliveries(order.id),
  ]);
  const summaries = order.line_items_json.map(getOrderLineItemProductionSummary);
  const attentionItems = buildAttentionItems(order, summaries);

  return (
    <AdminShell>
      <section className="tr-admin-section">
        <div className="flex flex-wrap items-center justify-between gap-3"><AdminLinkButton href="/admin/orders" className="min-h-9 px-3 py-1.5 text-xs" variant="outline">Back to orders</AdminLinkButton><AdminLinkButton href="/admin/orders/new" variant="primary" className="min-h-11">+ Create complimentary order</AdminLinkButton></div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 flex-1">
            <p className="tr-eyebrow">Order detail</p>
            <h1 className="tr-admin-title mt-2 break-words">{order.customer_name ?? "Customer order"}</h1>
            <p className="mt-2 font-mono text-sm text-muted">Order {formatOrderReference(order.stripe_checkout_session_id || order.id)}</p>
            <details className="mt-2 text-xs text-muted">
              <summary className="cursor-pointer">Payment reference</summary>
              <p className="mt-2 break-all font-mono text-xs text-muted">{order.stripe_checkout_session_id}</p>
            </details>
          </div>
          <div className="tr-admin-card shrink-0 px-4 py-3 text-sm font-semibold text-ink">
            {formatPrice(order.total_cents)}
          </div>
        </div>

        {attentionItems.length ? <OrderAttentionCard items={attentionItems} /> : null}
        <a href="#customer-email-history" className="mt-4 inline-block font-semibold text-brand underline">View customer email history</a>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 space-y-6">
            <InfoCard title="Customer">
              <Field label="Name" value={order.customer_name} />
              <Field label="Email" value={order.email} />
              <Field label="Phone" value={readNested(order.customer_details_json, ["phone"])} />
            </InfoCard>

            <InfoCard title="Shipping address">
              <AddressBlock address={order.shipping_address_json ?? order.customer_details_json} />
              <Field label="Shipping mode" value={order.shipping_mode ?? "manual"} />
              <Field label="Shipping amount" value={formatPrice(order.shipping_amount_cents)} />
            </InfoCard>

            <InfoCard title="Line items">
              {canChangeComplimentaryStand(order) && <AdminLinkButton href={`/admin/orders/${id}/edit`} variant="primary" className="mb-4 min-h-11">Change stand / design</AdminLinkButton>}
              <div className="space-y-4">
                {order.line_items_json.map((item, index) => (
                  <LineItemDetail standIds={standRecords.filter(s=>s.line_id===item.standLineId&&Number(s.unit_number)<=item.quantity).map(s=>String(s.public_id))} key={`${item.productId}-${item.optionId ?? "base"}-${index}`} item={item} order={order} index={index} artworkUrl={getAdminOrderArtworkUrl(order, index)} />
                ))}
              </div>
            </InfoCard>
          </div>

          <div className="min-w-0 space-y-6">
            <InfoCard title="Status">
              <Field label="Payment" value={formatPaymentStatus(order)} />
              <Field label="Payment status" value={order.payment_status} />
              <Field label="Refund ID" value={order.stripe_refund_id} />
              <Field label="Refunded at" value={order.refunded_at ? new Date(order.refunded_at).toLocaleString() : null} />
              <Field label="Production" value={order.production_status.replaceAll("_", " ")} />
              <Field label="Shipping" value={order.shipping_status.replaceAll("_", " ")} />
              <Field label="Shipped at" value={order.shipped_at ? new Date(order.shipped_at).toLocaleString() : null} />
              <Field label="Tracking" value={order.tracking_number} />
              <Field label="Tracking URL" value={order.tracking_url} link />
            </InfoCard>
            {order.id && order.payment_status !== "complimentary" && (order.status === "paid" || order.payment_status === "paid" || order.payment_status === "refunded") ? (
              <OrderRefundForm
                orderId={order.id}
                alreadyRefunded={order.payment_status === "refunded"}
                hasSubscription={order.line_items_json.some((item) => item.destinationMode === "HOSTED")}
                refundId={order.stripe_refund_id}
                refundStatus={order.refund_status}
                refundFailureReason={order.refund_failure_reason}
              />
            ) : null}
            {typeof order.customer_details_json?.recovery_original_order_id === "string" ? <InfoCard title="Recovered checkout"><a className="text-sm underline" href={`/admin/orders/${order.customer_details_json.recovery_original_order_id}`}>View original order and email history</a></InfoCard> : order.id && order.status !== "paid" && <OrderCustomerEmail orderId={order.id} />}
            {order.id && canRunOrderProductionActions(order) ? <OrderProductionActions orderId={order.id} customItems={order.line_items_json.flatMap((item,index)=>getOrderLineItemProductionSummary(item).fulfillmentKind==='custom'?[{index,title:item.title,quantity:item.quantity}]:[])} /> : null}
            <OrderFulfillmentForm order={order} productionBlockers={getOrderProductionBlockers(order)} />
          </div>
        </div>
        <section id="customer-email-history" className="mt-8 scroll-mt-24">
          <h2 className="text-xl font-semibold">Customer emails &amp; notifications</h2>
          <p className="mb-5 mt-2 text-sm text-muted">Actual email attempts for this order. Accepted means the email provider received it; Delivered means the recipient's mail server confirmed delivery. This does not confirm the customer read it.</p>
          {order.tracking_number && !order.shipped_at && order.shipping_status !== "shipped" && order.shipping_status !== "delivered" && !deliveryOverview.deliveries.some((email) => email.messageType === "shipping_tracking_customer") ? <AdminAlert tone="warning" className="mb-4">Tracking is saved, but this order is not marked shipped. Saving tracking alone does not send the shipping notification. Mark the order shipped in Fulfillment operations when it has shipped.</AdminAlert> : null}
          <EmailDeliveryHistory overview={deliveryOverview} orderScoped />
          <a className="mt-4 inline-block text-sm font-semibold text-brand underline" href="/admin/settings/emails">View all email delivery history</a>
        </section>
      </section>
    </AdminShell>
  );
}
