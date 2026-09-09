"use client";

import { useEffect, useState } from "react";
import type { CartItem } from "@/lib/cart";
import type { ProofApprovalSnapshot } from "@/lib/direct-production";

export type ReadyBrandedProof = { proofReceiptId: string; snapshot: ProofApprovalSnapshot; draftKey: string };

export function BrandedProofPreview({ productSlug, setup, onReady }: {
  productSlug: string;
  setup: NonNullable<CartItem["setup"]>;
  onReady: (proof: ReadyBrandedProof | null) => void;
}) {
  const draftKey = JSON.stringify(setup);
  const [image, setImage] = useState<{ src: string; proof: ReadyBrandedProof } | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let objectUrl: string | undefined;
    setImage(null);
    setError("");
    onReady(null);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/setup/proof", {
          method: "POST", signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item: { productId: productSlug, optionId: "branded_qr_direct", quantity: 1, setup: JSON.parse(draftKey) } })
        });
        const body = await response.json();
        if (!response.ok || !body.svg || !body.snapshot || !body.proofReceiptId) throw new Error(body.error || "Artwork preview could not be created.");
        if (!active) return;
        objectUrl = URL.createObjectURL(new Blob([body.svg], { type: "image/svg+xml" }));
        setImage({ src: objectUrl, proof: { snapshot: body.snapshot, proofReceiptId: body.proofReceiptId, draftKey } });
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : "Artwork preview could not be created.");
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [draftKey, productSlug, onReady, retry]);

  return <div className="grid min-w-0 content-start gap-3">
    <div className="mx-auto grid w-full max-w-[340px] place-items-center border border-line bg-white" style={{ aspectRatio: "1278 / 1949" }} aria-busy={!image && !error}>
      {image && image.proof.draftKey === draftKey ? <img
        src={image.src} alt="Your Branded stand print preview" width={1278} height={1949}
        className="block h-auto w-full"
        onLoad={() => onReady(image.proof)}
        onError={() => { onReady(null); setImage(null); setError("The preview image could not be displayed. Please try again."); }}
      /> : <p className="p-6 text-center text-sm text-muted" role="status">{error || "Preparing your stand preview..."}</p>}
    </div>
    {error ? <div className="grid gap-2"><p role="alert" className="text-sm text-red-700">{error}</p><button type="button" className="tr-button-outline" onClick={() => setRetry((value) => value + 1)}>Retry preview</button></div> : null}
    <p className="text-center text-xs text-muted">Front artwork · 4.26 × 6.50 in</p>
  </div>;
}
