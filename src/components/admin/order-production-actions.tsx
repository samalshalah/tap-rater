"use client";

import { RefreshCw, Send, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminAlert, AdminButton, AdminCard, AdminTextarea } from "./admin-ui";

type ProductionAction = "approve_proof_manually" | "regenerate_artwork" | "request_customer_changes";

export function OrderProductionActions({ orderId, customItems=[] }: { orderId: string;customItems?:{index:number;title:string;quantity:number}[] }) {
  const router = useRouter();
  const [proofIndex,setProofIndex]=useState(String(customItems[0]?.index??0));
  const [uploading,setUploading]=useState(false);
  const [note, setNote] = useState("");
  const [pendingAction, setPendingAction] = useState<ProductionAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadProof(file?:File){if(!file)return;setUploading(true);setError(null);try{const form=new FormData();form.set('file',file);form.set('lineItemIndex',proofIndex);const r=await fetch(`/api/admin/orders/${orderId}/customer-proof`,{method:'POST',body:form}),data=await r.json();if(!r.ok)throw Error(data.error);setMessage('Proof is ready for the customer to review.');router.refresh();}catch(e){setError(e instanceof Error?e.message:'Upload failed.');}finally{setUploading(false);}}
  async function runAction(action: ProductionAction) {
    setPendingAction(action);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/production-action`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, note })
      });
      const data = (await response.json().catch(() => null)) as { error?: string; productionStatus?: string } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Production action could not be completed.");
      }

      setMessage(`Action completed. Production status: ${(data?.productionStatus ?? "updated").replaceAll("_", " ")}.`);
      setNote("");
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Production action could not be completed.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <AdminCard title="Artwork operations" description="Review branded artwork state, regenerate print-ready artwork, or request customer changes before production.">
      <div className="space-y-4">
        {!!customItems.length&&<details className="rounded border border-line p-3"><summary className="cursor-pointer text-sm font-semibold">Customer proof</summary><div className="mt-3 grid gap-3"><label>Order item<select value={proofIndex} onChange={e=>setProofIndex(e.target.value)}>{customItems.map(item=><option key={item.index} value={item.index}>{item.title} · Qty {item.quantity}</option>)}</select></label><label>Upload proof image<input type="file" disabled={uploading} accept="image/png,image/jpeg,image/webp" onChange={e=>void uploadProof(e.target.files?.[0])}/></label></div></details>}
        <label className="block text-sm font-semibold text-ink">
          Production note
          <AdminTextarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="mt-2" placeholder="Optional note for this production action." />
        </label>
        <div className="grid gap-2">
          <AdminButton type="button" variant="primary" onClick={() => runAction("approve_proof_manually")} loading={pendingAction === "approve_proof_manually"}>
            <ShieldCheck size={16} />
            Approve artwork and generate print file
          </AdminButton>
          <AdminButton type="button" onClick={() => runAction("regenerate_artwork")} loading={pendingAction === "regenerate_artwork"}>
            <RefreshCw size={16} />
            Regenerate artwork
          </AdminButton>
          <AdminButton type="button" variant="outline" onClick={() => runAction("request_customer_changes")} loading={pendingAction === "request_customer_changes"}>
            <Send size={16} />
            Request customer changes
          </AdminButton>
        </div>
        {message ? <AdminAlert tone="success">{message}</AdminAlert> : null}
        {error ? <AdminAlert tone="danger">{error}</AdminAlert> : null}
      </div>
    </AdminCard>
  );
}
