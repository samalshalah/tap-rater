import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronRight, CreditCard, HelpCircle, PanelsTopLeft, Receipt } from "lucide-react";
import type { CustomerPortalData } from "@/lib/customer-portal";
import { formatOrderReference } from "@/lib/order-reference";
import { getProductBySlug } from "@/lib/products";
import { getProductVisual } from "@/lib/storefront-visuals";
import { optimizedUploadSrc } from "@/lib/optimized-upload";

export function MobileAccountOverview({ portal }: { portal: CustomerPortalData }) {
  const order = portal.orders[0];
  const product = order?.items[0] ? getProductBySlug(order.items[0].lineItem.productId) : undefined;
  const image = product ? getProductVisual(product) : undefined;
  const paid = order?.paymentStatus === "paid" || order?.status === "paid";
  const reversed = /refund|cancel/.test(`${order?.paymentStatus} ${order?.status}`);
  const shipped = order?.shippingStatus === "shipped" || order?.shippingStatus === "delivered";
  const preparing = paid && ["ready_for_production", "in_production", "completed"].includes(order?.productionStatus ?? "");
  const status = order?.productionStatus === "blocked" || order?.shippingStatus === "blocked" ? "Order needs attention" : reversed ? "Order canceled or refunded" : shipped ? (order?.shippingStatus === "delivered" ? "Delivered" : "On its way") : preparing ? "Preparing your stand" : paid ? "Payment received" : "Payment pending";
  const pendingStand = portal.stands.find(stand => stand.multiLinkSetupPending);
  return <div className="tr-mobile-account">
    {pendingStand ? <Link href="/account/stands" className="mb-4 flex min-h-12 items-center justify-between rounded-lg bg-panel p-4 text-brand">Finish your Multi-Link setup<ArrowRight size={20} aria-hidden="true" /></Link> : null}
    {order ? <section className="tr-mobile-order" aria-label="Latest order">
      <p className="text-xs font-semibold tracking-wider text-muted">LATEST ORDER</p>
      <h2>{formatOrderReference(order.reference)}</h2>
      <div className="flex items-center gap-3">
      {image ? <Image src={optimizedUploadSrc(image.src, 160)} alt="" width={62} height={72} unoptimized className="shrink-0 rounded-lg" /> : null}
      <div className="min-w-0"><p className="tr-mobile-order-title">{order.items[0]?.title ?? `${order.itemCount} stand${order.itemCount === 1 ? "" : "s"}`}</p>
      {order.items.length > 1 ? <p className="text-sm text-muted">+ {order.items.length - 1} more item{order.items.length > 2 ? "s" : ""}</p> : null}
      <p className="mt-1 text-muted">{new Intl.NumberFormat("en-US", { style: "currency", currency: order.currency.toUpperCase() }).format(order.totalCents / 100)}</p>
      <p className="mt-2 font-medium text-brand">{status}</p>
      </div></div>
      {!reversed ? <ol className="tr-order-steps" aria-label="Order progress">{[ { label: "Paid", complete: paid }, { label: "Preparing", complete: preparing || shipped }, { label: "Shipped", complete: shipped } ].map(step => <li key={step.label} data-complete={step.complete}>{step.label}<span className="sr-only">{step.complete ? ": reached" : ": pending"}</span></li>)}</ol> : null}
      <Link href="/account/orders" className="tr-mobile-primary mt-4">View order &amp; invoice<ArrowRight size={19} aria-hidden="true" /></Link>
    </section> : <section className="tr-mobile-order"><h2>Your first stand starts here.</h2><p className="mb-4 text-muted">Your orders and invoices will appear here after checkout.</p><Link href="/shop" className="tr-mobile-primary">Shop stands<ArrowRight size={20} aria-hidden="true" /></Link></section>}
    <section className="tr-account-manage"><h2>Manage</h2>{[
      { label: "My stands", detail: "View stands & edit Multi-Link pages", href: "/account/stands", icon: PanelsTopLeft },
      { label: "Orders & invoices", detail: "Order history and receipts", href: "/account/orders", icon: Receipt },
      { label: "Billing", detail: "Payments and subscriptions", href: "/account/billing", icon: CreditCard },
      { label: "Help & support", detail: "We’re here to help", href: "/support", icon: HelpCircle }
    ].map(({ label, detail, href, icon: Icon }) => <Link key={label} href={href}><Icon size={25} aria-hidden="true" /><span><strong>{label}</strong><small>{detail}</small></span><ChevronRight size={20} aria-hidden="true" /></Link>)}</section>
    <form action="/api/account/logout" method="post" className="mt-5 text-center"><button className="min-h-11 px-5 text-muted underline">Sign out</button></form>
  </div>;
}
