"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/admin-ui";

export type ReplacementCustomer = { email: string; name: string; orders: Array<{ id: string; reference: string; label: string; createdAt?: string }> };

export function ReplacementOrderForm({ customers, selectedEmail }: { customers: ReplacementCustomer[]; selectedEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(customers.some((customer) => customer.email === selectedEmail) ? selectedEmail! : customers[0]?.email ?? "");
  const [orderId, setOrderId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef("");
  const customer = customers.find((item) => item.email === email);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!orderId || busy) return;
    setBusy(true); setError("");
    if (!requestId.current) requestId.current = crypto.randomUUID();
    try {
      const response = await fetch("/api/admin/orders/replacement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: requestId.current, originalOrderId: orderId }) });
      const result = await response.json();
      if (!response.ok || !result.orderId) throw new Error(result.error ?? "Could not create the replacement.");
      router.push(`/admin/orders/${result.orderId}`); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create the replacement."); setBusy(false); }
  }

  return <form onSubmit={submit} className="max-w-3xl space-y-5">
    <div className="grid gap-4 rounded-xl border border-line bg-white p-5">
      <label className="grid gap-1 text-sm font-semibold">Customer
        <select value={email} onChange={(event) => { setEmail(event.target.value); setOrderId(""); }} className="rounded-lg border border-line p-3">
          {customers.map((item) => <option key={item.email} value={item.email}>{item.name} — {item.email}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-semibold">Original order to replace
        <select required value={orderId} onChange={(event) => setOrderId(event.target.value)} className="rounded-lg border border-line p-3">
          <option value="" disabled>Select the damaged stand order</option>
          {customer?.orders.map((order) => <option key={order.id} value={order.id}>{order.reference} — {order.label}{order.createdAt ? ` · ${new Date(order.createdAt).toLocaleDateString()}` : ""}</option>)}
        </select>
      </label>
      <div className="rounded-lg bg-teal-50 p-4 text-sm text-ink"><strong>What will be copied:</strong> the product, quantity, logo, business name, QR/NFC destination, design settings, approved artwork, and the original shipping address. Payment, old tracking, and the original fulfillment status are not copied.</div>
    </div>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    <AdminButton type="submit" variant="primary" disabled={!orderId || busy}>{busy ? "Creating replacement…" : "Create $0 replacement order"}</AdminButton>
  </form>;
}
