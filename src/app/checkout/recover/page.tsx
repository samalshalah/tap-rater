import { verifyRecoveryToken, loadReminderOrder, reminderState } from "@/lib/checkout-reminders";
import { unpaidRecoverable } from "@/lib/checkout-reminder-model";
import { RecoveryAction } from "@/components/checkout/recovery-action";
import { formatOrderReference } from "@/lib/order-reference";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your saved order | Tap Rater", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function RecoveryPage({ searchParams }: { searchParams: Promise<{ token?: string; unsubscribe?: string }> }) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const id = verifyRecoveryToken(token);
  const order = id ? await loadReminderOrder(id).catch(() => null) : null;
  const state = id ? await reminderState(id) : null;
  const valid = order && state && Date.parse(state.token_expires_at) > Date.now();
  const unsubscribe = params.unsubscribe === "1";
  const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: order?.currency || "usd" }).format(cents / 100);
  return <main className="mx-auto max-w-xl px-5 py-12"><div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
    <p className="tr-eyebrow">Tap Rater</p><h1 className="mt-3 text-3xl font-semibold">{unsubscribe ? "Email preferences" : "Your saved order"}</h1>
    {!valid ? <p className="mt-5">This link is invalid or expired. Contact support for a new invitation.</p>
      : unsubscribe ? <><p className="mt-5">Stop reminders about unfinished checkouts. You’ll still receive receipts and updates for paid orders.</p><RecoveryAction token={token} unsubscribe /></>
      : !unpaidRecoverable(order) ? <p className="mt-5">This order no longer needs payment here. Check your account or contact support.</p>
      : <><p className="mt-3 text-sm text-muted">Order {formatOrderReference(order.stripe_checkout_session_id)} · Awaiting payment</p>
        <p className="mt-5 text-sm">Your saved designs and order details will be retained. Please contact us before paying if you need any changes.</p>
        <div className="mt-6 divide-y divide-line">{order.line_items_json.map((item, i) => <div key={i} className="flex justify-between gap-3 py-4 text-sm"><span>{item.quantity} × {item.title}<span className="block text-muted">{item.optionLabel}</span></span><strong>{money(item.lineSubtotalCents)}</strong></div>)}</div>
        <p className="mt-4 flex justify-between text-sm"><span>Shipping</span><span>{order.shipping_amount_cents ? money(order.shipping_amount_cents) : "Free"}</span></p>
        <p className="mt-4 flex justify-between text-xl font-semibold"><span>Total due</span><span>{money(order.total_cents)}</span></p>
        <p className="mt-3 text-xs text-muted">Includes applicable tax. Any monthly Multi-Link service is shown separately on the secure payment page.</p>
        <RecoveryAction token={token} /></>}
    <a className="mt-6 inline-block text-sm underline" href="/support">Contact support</a>
  </div></main>;
}
