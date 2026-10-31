"use client";

import { useEffect, useRef, useState } from "react";
import type { CartItem } from "@/lib/cart";
import type { ProofApprovalSnapshot } from "@/lib/direct-production";

export type ReadyBrandedProof = { proofReceiptId: string; snapshot: ProofApprovalSnapshot; draftKey: string };

export function BrandedProofPreview({ productSlug, setup, onReady, endpoint = "/api/setup/proof" }: {
  endpoint?: string;
  productSlug: string;
  setup: NonNullable<CartItem["setup"]>;
  onReady: (proof: ReadyBrandedProof | null) => void;
}) {
  const draftKey = JSON.stringify(setup);
  const previewAssets = useRef<Record<string, string>>({});
  const [image, setImage] = useState<{ src: string; proof: ReadyBrandedProof } | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const isCurrent = image?.proof.draftKey === draftKey;
  // Keep the last rendered proof while its replacement is being prepared.
  // Its receipt remains invalid until the current draft's image has loaded.
  useEffect(() => {
    const src = image?.src;
    return () => { if (src) URL.revokeObjectURL(src); };
  }, [image?.src]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setError("");
    onReady(null);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(endpoint, {
          method: "POST", signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ previewTransfer: 1, knownAssets: Object.keys(previewAssets.current), item: { productId: productSlug, optionId: "branded_qr_direct", quantity: 1, setup: JSON.parse(draftKey) } })
        });
        const body = await response.json();
        if (!response.ok || !body.svg || !body.snapshot || !body.proofReceiptId) throw new Error(body.error || "Artwork preview could not be created.");
        if (!active) return;
        const availableAssets = { ...previewAssets.current, ...body.assets };
        const displaySvg = body.svg.replace(/proof-asset:([a-f0-9]{64})/g, (_: string, id: string) => {
          if (!availableAssets[id]) throw new Error("Preview image is missing. Please retry the preview.");
          return availableAssets[id];
        });
        previewAssets.current = Object.fromEntries((body.assetIds ?? []).map((id: string) => [id, availableAssets[id]]));
        const objectUrl = URL.createObjectURL(new Blob([displaySvg], { type: "image/svg+xml" }));
        setImage({ src: objectUrl, proof: { snapshot: body.snapshot, proofReceiptId: body.proofReceiptId, draftKey } });
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : "Artwork preview could not be created.");
      }
    }, 600);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [draftKey, productSlug, onReady, retry, endpoint]);

  return <div className="grid min-w-0 self-start content-start gap-2 bg-white pb-2">
    <div className="relative mx-auto grid w-full max-w-[340px] place-items-center border border-line bg-white md:max-w-[min(340px,38dvh)]" style={{ aspectRatio: "1278 / 1949" }} aria-busy={!isCurrent && !error}>
      {image ? <img
        src={image.src} alt="Your Branded stand print preview" width={1278} height={1949}
        className="absolute inset-0 block h-full w-full object-contain"
        onLoad={() => { if (isCurrent) onReady(image.proof); }}
        onError={() => { onReady(null); setImage(null); setError("The preview image could not be displayed. Please try again."); }}
      /> : <p className="absolute inset-0 grid place-items-center p-3 text-center text-sm text-muted" role="status">{error || "Preparing your stand preview..."}</p>}
      {image && !isCurrent && !error ? <p role="status" className="absolute inset-x-0 bottom-0 bg-white/95 px-1 py-2 text-center text-xs font-semibold text-brand">Updating preview…</p> : null}
    </div>
    {error ? <div className="grid gap-2"><p role="alert" className="text-sm text-red-700">{error}</p><button type="button" className="tr-button-outline" onClick={() => setRetry((value) => value + 1)}>Retry preview</button></div> : null}
    <p className="text-center text-[10px] leading-4 text-muted md:text-xs">Front artwork · 4.26 × 6.50 in</p>
  </div>;
}
