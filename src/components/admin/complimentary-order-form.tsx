"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Catalog = { slug: string; title: string; options: { id: string; label: string }[] }[];
export function ComplimentaryOrderForm({ catalog }: { catalog: Catalog }) {
  const router = useRouter();
  const [productId, setProductId] = useState(catalog[0]?.slug ?? "");
  const product = catalog.find(p => p.slug === productId);
  const [optionId, setOptionId] = useState(product?.options[0]?.id ?? "");
  const [delivery, setDelivery] = useState("free_shipping");
  const [logo, setLogo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef("");
  const lock = useRef(false);
  const field = (name: string, label: string, type = "text", required = true) => <label className="grid gap-1 text-sm">{label}<input className="rounded border border-line p-2" name={name} type={type} required={required} /></label>;
  async function upload(file?: File) {
    setLogo(""); if (!file) return;
    setUploading(true); setError("");
    try {
      const form = new FormData(); form.set("file", file); form.set("role", "gallery"); form.set("productSlug", productId);
      const res = await fetch("/api/admin/media/upload", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok || !body.asset?.storageKey) throw new Error(body.error ?? "Logo upload failed.");
      setLogo(body.asset.storageKey);
    } catch (e) { setError(e instanceof Error ? e.message : "Logo upload failed."); }
    finally { setUploading(false); }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current || uploading) return;
    lock.current = true; setBusy(true); setError("");
    if (!requestId.current) requestId.current = crypto.randomUUID();
    const data = new FormData(event.currentTarget); const value = (key: string) => String(data.get(key) ?? "").trim();
    try {
      const response = await fetch("/api/admin/orders/complimentary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        requestId: requestId.current, productId, optionId, quantity: Number(value("quantity")), businessName: value("businessName"), destinationUrl: value("destinationUrl"), reason: value("reason"), delivery,
        logoStorageKey: optionId === "branded_qr_direct" ? logo : undefined,
        customer: { name: value("name"), email: value("email"), phone: value("phone") },
        shippingAddress: delivery === "free_shipping" ? { name: value("name"), line1: value("line1"), line2: value("line2"), city: value("city"), state: value("state"), postalCode: value("postalCode"), country: "US", phone: value("phone") } : undefined
      }) });
      const result = await response.json(); if (!response.ok || !result.orderId) throw new Error(result.error ?? "Could not create order.");
      router.push(`/admin/orders/${result.orderId}`); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create order."); lock.current = false; setBusy(false); }
  }
  if (!catalog.length) return <p>No active, in-stock stands are available.</p>;
  return <form onSubmit={submit} className="max-w-3xl space-y-5">
    <fieldset disabled={busy || uploading} className="grid gap-4 rounded border border-line p-5">
      <legend className="font-semibold">Client and stand</legend>
      <div className="grid gap-4 sm:grid-cols-2">{field("name", "Client name")}{field("email", "Client email", "email")}{field("phone", "Phone", "tel", false)}{field("businessName", "Business name")}</div>
      <label className="grid gap-1">Existing stand<select className="rounded border p-2" value={productId} onChange={e => { setProductId(e.target.value); setOptionId(catalog.find(p => p.slug === e.target.value)?.options[0]?.id ?? ""); }}>{catalog.map(p => <option key={p.slug} value={p.slug}>{p.title}</option>)}</select></label>
      <label className="grid gap-1">Design<select className="rounded border p-2" value={optionId} onChange={e => setOptionId(e.target.value)}>{product?.options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
      <label className="grid gap-1">Quantity<input name="quantity" type="number" min={1} max={100} defaultValue={1} required className="rounded border p-2" /></label>
      {field("destinationUrl", "Destination / review link", "url")}
      {optionId === "branded_qr_direct" && <label className="grid gap-2">Client logo (PNG, JPEG or WebP)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void upload(e.target.files?.[0])} />{logo && <span className="text-sm">Logo uploaded. Artwork will need manual approval on the order.</span>}</label>}
      <label className="grid gap-1">Reason for complimentary order<textarea name="reason" required minLength={3} maxLength={1000} className="rounded border p-2" placeholder="Client gift, sample, replacement…" /></label>
      <label className="grid gap-1">Delivery<select value={delivery} onChange={e => setDelivery(e.target.value)} className="rounded border p-2"><option value="free_shipping">Free shipping (US)</option><option value="pickup">Pickup / hand delivery</option></select></label>
      {delivery === "free_shipping" && <div className="grid gap-4 sm:grid-cols-2">{field("line1", "Street address")}{field("line2", "Apt / suite", "text", false)}{field("city", "City")}{field("state", "State (two-letter code)")}{field("postalCode", "ZIP code")}</div>}
    </fieldset>
    <p className="font-semibold">Client total: $0.00 — Complimentary</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <button className="tr-btn-primary" disabled={busy || uploading || (optionId === "branded_qr_direct" && !logo)}>{uploading ? "Uploading logo…" : busy ? "Creating order…" : "Create complimentary order"}</button>
  </form>;
}
