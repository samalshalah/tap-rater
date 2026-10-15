"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminButton } from "@/components/admin/admin-ui";
import { searchGoogleBusinesses, type GoogleBusinessSelection } from "@/lib/google-places-client";
import { BrandedProofPreview } from "@/components/product/branded-proof-preview";
import { useRouter } from "next/navigation";

type Catalog = { slug: string; title: string; options: { id: string; label: string }[] }[];
export type StandEditInitial = { orderId: string; expectedUpdatedAt: string; productId: string; optionId: string; businessName: string; destinationUrl: string; logoStorageKey: string; quantity: number; design: { fontSizePercent: number; logoSizePercent: number; logoOffsetXPercent: number; logoOffsetYPercent: number; logoFitMode: "contain" | "fill"; showBusinessNameOnProof: boolean } };
export function ComplimentaryOrderForm({ catalog, initial }: { catalog: Catalog; initial?: StandEditInitial }) {
  const router = useRouter();
  const [productId, setProductId] = useState(initial?.productId ?? catalog[0]?.slug ?? "");
  const product = catalog.find(p => p.slug === productId);
  const [optionId, setOptionId] = useState(initial?.optionId ?? product?.options[0]?.id ?? "");
  const [businessName, setBusinessName] = useState(initial?.businessName ?? "");
  const [destinationUrl, setDestinationUrl] = useState(initial?.destinationUrl ?? "");
  const [matches, setMatches] = useState<GoogleBusinessSelection[]>([]);
  const [searchStatus, setSearchStatus] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState("");
  const [design, setDesign] = useState(initial?.design ?? { fontSizePercent: 100, logoSizePercent: 100, logoOffsetXPercent: 0, logoOffsetYPercent: 0, logoFitMode: "contain" as "contain" | "fill", showBusinessNameOnProof: true });
  const previewReady = useCallback(() => {}, []);
  useEffect(() => {
    setMatches([]); setSearchStatus("");
    if (productId !== "google-review-stand" || businessName.trim().length < 3 || selectedBusiness) return;
    const controller = new AbortController(); let active = true;
    const timer = setTimeout(() => {
      setSearchStatus("Searching Google businesses...");
      searchGoogleBusinesses(businessName, controller.signal).then(result => {
        if (!active) return;
        setMatches(result.results);
        setSearchStatus(result.results.length ? "Select the correct business to fill its review link." : result.message || "No matches. Add a city to your search, or paste the review link below.");
      }).catch(() => { if (active) setSearchStatus("Search unavailable. Paste the Google review link below."); });
    }, 350);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [businessName, productId, selectedBusiness]);
  const [delivery, setDelivery] = useState("free_shipping");
  const [logo, setLogo] = useState(initial?.logoStorageKey ?? "");
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
      const response = await fetch(initial ? `/api/admin/orders/${initial.orderId}/stand` : "/api/admin/orders/complimentary", { method: initial ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        expectedUpdatedAt: initial?.expectedUpdatedAt, requestId: requestId.current, productId, optionId, quantity: Number(value("quantity")), businessName, destinationUrl, design: optionId === "branded_qr_direct" ? design : undefined, reason: value("reason"), delivery,
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
      <div className="grid gap-4 sm:grid-cols-2">{!initial && <>{field("name", "Client name")}{field("email", "Client email", "email")}{field("phone", "Phone", "tel", false)}</>}<label className="grid gap-1 text-sm">{productId === "google-review-stand" ? "Business name / Google search" : "Business name"}<input className="rounded border border-line p-2" name="businessName" required value={businessName} onChange={e => { setBusinessName(e.target.value); if (selectedBusiness) setDestinationUrl(""); setSelectedBusiness(""); }} placeholder={productId === "google-review-stand" ? "Business name and city" : "Business name"} autoComplete="off" /></label></div>
      <label className="grid gap-1">Existing stand<select className="rounded border p-2" value={productId} onChange={e => { setProductId(e.target.value); setMatches([]); setSelectedBusiness(""); setDestinationUrl(""); setOptionId(catalog.find(p => p.slug === e.target.value)?.options[0]?.id ?? ""); }}>{!product && <option value={productId}>Choose an available stand</option>}{catalog.map(p => <option key={p.slug} value={p.slug}>{p.title}</option>)}</select></label>
      {productId === "google-review-stand" && <div className="grid gap-2" aria-live="polite">
        <p className="text-sm text-muted">{selectedBusiness ? `Selected: ${selectedBusiness}` : searchStatus || "Type the business name above, then select its Google listing."}</p>
        {matches.map(place => <button key={place.placeId} type="button" className="rounded border border-line bg-white p-3 text-left hover:border-brand" onClick={() => { setBusinessName(place.name); setSelectedBusiness(`${place.name} — ${place.formattedAddress}`); setDestinationUrl(place.reviewUrl); setMatches([]); }}><span className="block font-semibold">{place.name}</span><span className="text-sm text-muted">{place.formattedAddress}</span></button>)}
      </div>}
      <label className="grid gap-1">Design<select className="rounded border p-2" value={optionId} onChange={e => setOptionId(e.target.value)}>{product?.options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
      <label className="grid gap-1">Quantity<input name="quantity" type="number" min={1} max={100} defaultValue={initial?.quantity ?? 1} readOnly={Boolean(initial)} required className="rounded border p-2" /></label>
      <label className="grid gap-1 text-sm">Destination / review link<input name="destinationUrl" type="url" required value={destinationUrl} onChange={e => setDestinationUrl(e.target.value)} className="rounded border border-line p-2" /></label>
      {optionId === "branded_qr_direct" && <label className="grid gap-2">Client logo (PNG, JPEG or WebP)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void upload(e.target.files?.[0])} />{logo && <span className="text-sm">Logo uploaded. Artwork will need manual approval on the order.</span>}</label>}
      {optionId === "branded_qr_direct" && <section className="grid gap-4 rounded-lg border border-line bg-soft p-4">
        <h2 className="font-semibold">Adjust your stand design</h2>
        <p className="text-sm text-muted">Your settings are saved with the order and used for the final print file.</p>
        <label className="flex items-center gap-2"><input type="checkbox" checked={design.showBusinessNameOnProof} onChange={e => setDesign(d => ({ ...d, showBusinessNameOnProof: e.target.checked }))} />Show business name on stand</label>
        {([['logoSizePercent', 'Logo size', 75, 160], ['fontSizePercent', 'Business name size', 75, 160], ['logoOffsetXPercent', 'Logo left / right', -20, 20], ['logoOffsetYPercent', 'Logo up / down', -20, 20]] as const).map(([key, label, min, max]) => <label key={key} className="grid gap-2 text-sm">{label}: {design[key]}%<input aria-label={label} type="range" min={min} max={max} value={design[key]} onChange={e => setDesign(d => ({ ...d, [key]: Number(e.target.value) }))} /></label>)}
        <label className="grid gap-1 text-sm">Logo fit<select value={design.logoFitMode} onChange={e => setDesign(d => ({ ...d, logoFitMode: e.target.value as "contain" | "fill" }))} className="rounded border p-2"><option value="contain">Fit entire logo</option><option value="fill">Fill logo area</option></select></label>
        {logo && businessName.trim() && /^https?:\/\//i.test(destinationUrl) ? <BrandedProofPreview productSlug={productId} setup={{ ...design, businessName: businessName.trim(), destinationUrl: destinationUrl.trim(), logoStorageKey: logo }} onReady={previewReady} endpoint="/api/admin/orders/complimentary/preview" /> : <p className="text-sm text-muted">Enter the business name, link and upload a logo to see the live preview.</p>}
      </section>}
      {!initial && <><label className="grid gap-1">Reason for complimentary order<textarea name="reason" required minLength={3} maxLength={1000} className="rounded border p-2" placeholder="Client gift, sample, replacement…" /></label>
      <label className="grid gap-1">Delivery<select value={delivery} onChange={e => setDelivery(e.target.value)} className="rounded border p-2"><option value="free_shipping">Free shipping (US)</option><option value="pickup">Pickup / hand delivery</option></select></label>
      {delivery === "free_shipping" && <div className="grid gap-4 sm:grid-cols-2">{field("line1", "Street address")}{field("line2", "Apt / suite", "text", false)}{field("city", "City")}{field("state", "State (two-letter code)")}{field("postalCode", "ZIP code")}</div>}</>}
    </fieldset>
    <p className="font-semibold">Client total: $0.00 — Complimentary</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <AdminButton type="submit" variant="primary" className="min-h-12 w-full sm:w-auto" disabled={!product || busy || uploading || (optionId === "branded_qr_direct" && !logo)}>{uploading ? "Uploading logo…" : busy ? "Saving order…" : initial ? "Save stand changes" : "Create complimentary order"}</AdminButton>
  </form>;
}
