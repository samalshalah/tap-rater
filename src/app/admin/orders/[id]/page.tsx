import {orderStandRegistry} from "@/lib/customer-stand-registry";
import { EmailDeliveryHistory } from "@/components/admin/email-delivery-history";
import { getAdminEmailDeliveries } from "@/lib/email-deliveries";
import { canChangeComplimentaryStand } from "@/lib/complimentary-orders";
import { OrderCustomerEmail } from "@/components/admin/order-customer-email";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminAlert, AdminBadge, AdminLinkButton } from "@/components/admin/admin-ui";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { OrderFulfillmentForm } from "@/components/admin/order-fulfillment-form";
import { OrderProductionActions } from "@/components/admin/order-production-actions";
import { OrderRefundForm } from "@/components/admin/order-refund-form";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/db";
import { canRunOrderProductionActions } from "@/lib/order-fulfillment-rules";
import { getAdminOrderById, getAdminOrderArtworkUrl, getOrderLineItemProductionSummary, getOrderProductionBlockers } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { formatOrderReference } from "@/lib/order-reference";
import { getStorefrontOrderAttribution } from "@/lib/storefront-analytics-report";
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

  const [standRecords, deliveryOverview, billingInvoiceResult, attribution] = await Promise.all([
    orderStandRegistry(id),
    getAdminEmailDeliveries(order.id),
    getSupabaseAdmin().from("billing_invoices").select("invoice_number,invoice_pdf_url,hosted_invoice_url").eq("order_id", id).maybeSingle(),
    getStorefrontOrderAttribution(order.stripe_checkout_session_id),
  ]);
  const summaries = order.line_items_json.map(getOrderLineItemProductionSummary);
  const attentionItems = buildAttentionItems(order, summaries);
  const billingInvoice = billingInvoiceResult.data as Record<string, unknown> | null;
  const invoicePdfUrl = readNested(order.customer_details_json, ["invoice_pdf_url"]) ?? readNested(billingInvoice, ["invoice_pdf_url"]);
  const hostedInvoiceUrl = readNested(order.customer_details_json, ["hosted_invoice_url"]) ?? readNested(billingInvoice, ["hosted_invoice_url"]);
  const invoiceNumber = readNested(order.customer_details_json, ["invoice_number"]) ?? readNested(billingInvoice, ["invoice_number"]);
  const reference = formatOrderReference(order.stripe_checkout_session_id || order.id);
  const collected = ["paid", "refunded", "partially_refunded", "refund_pending", "refund_failed", "complimentary"].includes(order.payment_status ?? "");
  // The payment invitation email only makes sense while the customer still owes payment.
  const awaitingPayment = order.status !== "paid" && !collected;
  const paymentTone = order.payment_status === "paid" || order.status === "paid" ? "success" : order.payment_status?.includes("refund") ? "warning" : "neutral";

  return (
    <AdminShell>
      <section className="tr-admin-section">
        <AdminPageHeader
          back={{ href: "/admin/orders", label: "Orders" }}
          title={`Order ${reference}`}
          description={<>{order.customer_name ?? order.email ?? "Customer"} · {formatPrice(order.total_cents)}{order.created_at ? <> · placed {new Date(order.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" })} ET</> : null}</>}
          actions={<>
            {invoicePdfUrl ? <a href={invoicePdfUrl} target="_blank" rel="noreferrer" className="tr-button-outline">Invoice PDF</a> : hostedInvoiceUrl ? <a href={hostedInvoiceUrl} target="_blank" rel="noreferrer" className="tr-button-outline">Stripe invoice</a> : null}
            <a href="#customer-email-history" className="tr-button-outline">Email history</a>
          </>}
        >
          <div className="tr-admin-order-status">
            <span>Payment <AdminBadge tone={paymentTone}>{formatPaymentStatus(order)}</AdminBadge></span>
            <span>Production <AdminBadge tone={order.production_status === "completed" ? "success" : order.production_status === "blocked" ? "warning" : "neutral"}>{order.production_status.replaceAll("_", " ")}</AdminBadge></span>
            <span>Shipping <AdminBadge tone={order.shipping_status === "shipped" || order.shipping_status === "delivered" ? "success" : order.shipping_status === "blocked" ? "warning" : "neutral"}>{order.shipping_status.replaceAll("_", " ")}</AdminBadge></span>
          </div>
        </AdminPageHeader>

        {attentionItems.length ? <OrderAttentionCard items={attentionItems} /> : null}

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 space-y-6">
            <InfoCard title="Line items">
              {canChangeComplimentaryStand(order) && <AdminLinkButton href={`/admin/orders/${id}/edit`} variant="primary" className="mb-4 min-h-11">Change stand / design</AdminLinkButton>}
              <div className="space-y-4">
                {order.line_items_json.map((item, index) => (
                  <LineItemDetail standIds={standRecords.filter(s=>s.line_id===item.standLineId&&Number(s.unit_number)<=item.quantity).map(s=>String(s.public_id))} key={`${item.productId}-${item.optionId ?? "base"}-${index}`} item={item} order={order} index={index} artworkUrl={getAdminOrderArtworkUrl(order, index)} />
                ))}
              </div>
            </InfoCard>
            <div className="grid gap-6 lg:grid-cols-2">
              <InfoCard title="Customer">
                <Field label="Name" value={order.customer_name} />
                <Field label="Email" value={order.email} />
                {order.payment_status === "complimentary" && (
                  <Field label="Order type" value={readNested(order.customer_details_json, ["complimentary_order_type"]) ?? "Unspecified"} />
                )}
                {typeof order.customer_details_json?.replacement_of_order_id === "string" && <p className="text-sm"><span className="font-semibold">Replacement for: </span><a className="text-brand underline" href={`/admin/orders/${order.customer_details_json.replacement_of_order_id}`}>View original order</a></p>}
                <Field label="Phone" value={readNested(order.customer_details_json, ["phone"])} />
              </InfoCard>
              <InfoCard title="Shipping address">
                <AddressBlock address={order.shipping_address_json ?? order.customer_details_json} />
                <Field label="Shipping mode" value={order.shipping_mode ?? "manual"} />
                <Field label="Shipping amount" value={formatPrice(order.shipping_amount_cents)} />
              </InfoCard>
            </div>
          </div>

          <div className="min-w-0 space-y-6">
            <OrderFulfillmentForm order={order} productionBlockers={getOrderProductionBlockers(order)} />
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
            {typeof order.customer_details_json?.recovery_original_order_id === "string" ? <InfoCard title="Recovered checkout"><a className="text-sm underline" href={`/admin/orders/${order.customer_details_json.recovery_original_order_id}`}>View original order and email history</a></InfoCard> : order.id && awaitingPayment && <OrderCustomerEmail orderId={order.id} />}
            {order.id && canRunOrderProductionActions(order) ? <OrderProductionActions orderId={order.id} customItems={order.line_items_json.flatMap((item,index)=>getOrderLineItemProductionSummary(item).fulfillmentKind==='custom'?[{index,title:item.title,quantity:item.quantity}]:[])} /> : null}
            <InfoCard title="Details">
              <Field label="Invoice number" value={invoiceNumber} />
              <Field label="Stripe checkout" value={order.stripe_checkout_session_id} />
              <Field label="Refund ID" value={order.stripe_refund_id} />
              <Field label="Refunded at" value={order.refunded_at ? new Date(order.refunded_at).toLocaleString() : null} />
              <Field label="Shipped at" value={order.shipped_at ? new Date(order.shipped_at).toLocaleString() : null} />
              <Field label="Tracking" value={order.tracking_number} />
              <Field label="Tracking URL" value={order.tracking_url} link />
            </InfoCard>
            {attribution && <InfoCard title="Order source">
              <Field label="Sales channel" value="TapRater.com" />
              <Field label="Traffic source" value={attribution.source} />
              {attribution.detail && <p className="text-sm text-muted">{attribution.detail}</p>}
              {attribution.campaign && <Field label="Campaign" value={attribution.campaign} />}
              {attribution.landingPage && <Field label="Landing page" value={attribution.landingPage} />}
            </InfoCard>}
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
