"use client";
import {useState} from 'react';
import {XCircle} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {AdminAlert,AdminButton,AdminCard} from '@/components/admin/admin-ui';

// Cancels an order that took no real payment, so its stands leave the client's account.
export function OrderCancelForm({orderId,blockedReason}:{orderId:string;blockedReason?:string}){
  const router=useRouter();
  const [confirmed,setConfirmed]=useState(false),[submitting,setSubmitting]=useState(false),[error,setError]=useState('');
  async function cancel(){
    if(!confirmed||submitting)return;
    setSubmitting(true);setError('');
    try{
      const response=await fetch(`/api/admin/orders/${orderId}/cancel`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmation:'CANCEL'})});
      const payload=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(payload?.error||'The order could not be cancelled.');
      router.refresh();
    }catch(cancelError){setError(cancelError instanceof Error?cancelError.message:'The order could not be cancelled.');}
    finally{setSubmitting(false);}
  }
  return <AdminCard title="Cancel order" description="Removes this order's stands from the client's account. The order stays in history as Cancelled.">
    {blockedReason?<p className="text-sm text-muted">{blockedReason}</p>:<>
      {error?<AdminAlert tone="danger" className="mb-4">{error}</AdminAlert>:null}
      <label className="mb-4 flex items-start gap-3 text-sm font-semibold leading-6 text-ink">
        <input className="mt-1 h-4 w-4" type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/>
        I understand the client will no longer see these stands. Nothing is charged or refunded.
      </label>
      <AdminButton type="button" variant="danger" disabled={!confirmed} loading={submitting} onClick={cancel}><XCircle size={16}/>Cancel order</AdminButton>
    </>}
  </AdminCard>;
}
