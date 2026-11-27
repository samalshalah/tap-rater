"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";

async function preparePhoto(file: File): Promise<Blob> {
  if (file.size > 25 * 1024 * 1024) throw new Error("Please choose a photo smaller than 25 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo processing is unavailable.");
    context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Could not prepare this photo.")), "image/jpeg", 0.85));
  } catch { throw new Error("This photo could not be opened. Please choose a JPG, PNG, or WebP photo."); }
  finally { URL.revokeObjectURL(url); }
}

export function ProductReviewForm({ token, firstName }: { token: string; firstName: string }) {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const photoVersion = useRef(0);
  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  async function selectPhoto(file?: File) {
    if (!file) return;
    const version = ++photoVersion.current;
    setPhotoBusy(true); setError(""); setPhoto(null);
    try { const prepared = await preparePhoto(file); if (version === photoVersion.current) setPhoto(prepared); }
    catch (e) { if (version === photoVersion.current) setError(e instanceof Error ? e.message : "Please try another photo."); }
    finally { if (version === photoVersion.current) setPhotoBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || photoBusy) return;
    setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    data.set("token", token);
    data.set("publishPermission", data.get("publishPermission") === "on" ? "true" : "false");
    data.set("photoPermission", data.get("photoPermission") === "on" ? "true" : "false");
    if (photo) data.set("photo", photo, "stand.jpg");
    try {
      const response = await fetch("/api/product-reviews", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your feedback could not be saved.");
      setDone(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }
  if (done) return <div role="status" className="space-y-4"><h2 className="text-2xl font-semibold">Thank you for sharing your experience.</h2><p>Your feedback has been received. Our team will review it before publishing, and will follow the permissions you selected.</p><Link href="/product/google-review-stand" className="tr-button-outline">Back to your stand</Link></div>;
  const input = "mt-2 block w-full rounded-lg border border-line bg-white p-3 text-base text-ink focus:outline-brand";
  return <form onSubmit={submit} className="space-y-6">
    <fieldset disabled={busy} className="space-y-6">
      <fieldset><legend className="font-semibold">How would you rate your stand?</legend><div className="mt-3 flex flex-wrap gap-2">{[1, 2, 3, 4, 5].map(value => <label key={value} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 has-[:checked]:border-brand has-[:checked]:bg-[#f6f8ff]"><input required type="radio" name="rating" value={value} aria-label={`${value} ${value === 1 ? "star" : "stars"}`} className="accent-brand" />{value} <span aria-hidden="true">★</span></label>)}</div><p className="mt-2 text-sm text-muted">1 = poor · 5 = excellent. Every honest rating is welcome.</p></fieldset>
      <label className="block font-semibold">Display name<input className={input} name="displayName" autoComplete="given-name" defaultValue={firstName} required maxLength={100} /><span className="mt-2 block text-sm font-normal text-muted">Use your first name or the name you want shown with your review.</span></label>
      <label className="block font-semibold">Business name <span className="font-normal text-muted">(optional)</span><input className={input} name="businessName" autoComplete="organization" maxLength={120} /></label>
      <label className="block font-semibold">Your experience<textarea className={input} name="body" rows={5} minLength={10} maxLength={2000} required placeholder="How is the print quality? Was setup easy? How are you using the stand?" /><span className="mt-2 block text-sm font-normal text-muted">10–2,000 characters. Please leave out phone numbers and other private information.</span></label>
      <fieldset className="rounded-xl border border-line bg-[#f6f8ff] p-5"><legend className="px-1 font-semibold">Photo of your stand in your shop <span className="font-normal">(optional)</span></legend><p className="mb-4 text-sm text-muted">Show us your stand in use. Avoid faces or customer details, and only upload a photo you have permission to share.</p><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Choose a photo<input disabled={photoBusy} className="mt-2 block w-full min-w-0 text-sm" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { void selectPhoto(e.target.files?.[0]); e.target.value = ""; }} /></label><label className="block text-sm font-semibold">Take a photo<input disabled={photoBusy} className="mt-2 block w-full min-w-0 text-sm" type="file" accept="image/*" capture="environment" onChange={e => { void selectPhoto(e.target.files?.[0]); e.target.value = ""; }} /></label></div>{photoBusy ? <p role="status" className="mt-3 text-sm">Preparing your photo…</p> : null}{preview ? <div className="mt-4"><img src={preview} alt="Your stand photo preview" className="max-h-64 w-auto max-w-full rounded-lg" /><button type="button" className="mt-3 text-sm font-semibold text-brand underline" onClick={() => { photoVersion.current++; setPhoto(null); }}>Remove photo</button></div> : null}</fieldset>
      <label className="flex items-start gap-3 text-sm leading-6"><input className="mt-1.5 accent-brand" type="checkbox" name="publishPermission" />I give Tap Rater permission to publish my rating, review, display name, and optional business name on taprater.com. Leave unchecked to keep my feedback private.</label>
      {photo ? <label className="flex items-start gap-3 text-sm leading-6"><input className="mt-1.5 accent-brand" type="checkbox" name="photoPermission" />I own this photo or have permission to share it, and allow Tap Rater to display it with my published review on taprater.com. Otherwise, the photo stays private.</label> : null}
      <p className="text-sm text-muted">Your email stays private. Publication permission is optional. To correct or withdraw your review later, reply to your invitation email. <Link className="text-brand underline" href="/privacy-policy">Privacy policy</Link></p>
      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      <button className="tr-button-primary" type="submit" disabled={busy || photoBusy}>{busy ? "Sending your feedback…" : "Send my feedback"}</button>
    </fieldset>
  </form>;
}
