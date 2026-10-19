"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/admin-ui";
export function CustomerCreateForm() {
 const router=useRouter();
 const [open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [created,setCreated]=useState<{id:string;email:string}|null>(null);
 const [sent,setSent]=useState(false);
 async function submit(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();setBusy(true);setError("");
  const data=new FormData(event.currentTarget);
  try {
   const response=await fetch("/api/admin/customers",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name:data.get("name"),email:data.get("email"),phone:data.get("phone")})});
   const result=await response.json();
   if(!response.ok) throw new Error(result.error || "Could not create customer.");
   setCreated(result.customer);setSent(false);router.refresh();
  } catch(e) {setError(e instanceof Error?e.message:"Could not create customer.");}
  finally {setBusy(false);}
 }
 async function sendActivation() {
  if(!created)return;
  setBusy(true);setError("");
  try {
   const response=await fetch("/api/admin/customers/"+created.id+"/activation",{method:"POST"});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error || "Could not send activation email.");
   setSent(true);router.refresh();
  } catch(e) {setError(e instanceof Error?e.message:"Could not send activation email.");}
  finally {setBusy(false);}
 }
 return <section className="mt-6 rounded-xl border border-line bg-white p-5" aria-label="Create customer">
  <AdminButton type="button" onClick={()=>{setOpen(!open);setError("");}}> {open?"Close create customer":"Create customer"} </AdminButton>
  {open && <div className="mt-4 max-w-xl">
   <h2 className="text-lg font-semibold">New customer account</h2>
   <p className="mt-2 text-sm text-muted">Create the customer first, then send an activation email so they can choose their password. Existing businesses and workspaces are assigned separately.</p>
   {created ? <div className="mt-4 space-y-3">
    <p role="status" className="text-sm">Customer created: <strong>{created.email}</strong>. {sent?"Activation email sent.":"Pending activation. No email has been sent yet."}</p>
    <AdminButton type="button" onClick={sendActivation} disabled={busy||sent}>{busy?"Sending…":sent?"Activation sent":"Send activation email"}</AdminButton>
    <button type="button" className="ml-3 text-sm underline" disabled={busy} onClick={()=>{setCreated(null);setError("");}}>Create another customer</button>
   </div> : <form onSubmit={submit} className="mt-4 grid gap-4">
    <label className="text-sm font-semibold">Customer name<input name="name" required maxLength={120} autoComplete="name" className="mt-1 block w-full rounded-lg border border-line p-3" placeholder="Norah Boutique" /></label>
    <label className="text-sm font-semibold">Customer email<input name="email" type="email" required maxLength={254} autoComplete="email" className="mt-1 block w-full rounded-lg border border-line p-3" placeholder="Your Norah Boutique email" /></label>
    <label className="text-sm font-semibold">Phone (optional)<input name="phone" type="tel" maxLength={40} autoComplete="tel" className="mt-1 block w-full rounded-lg border border-line p-3" /></label>
    <AdminButton type="submit" disabled={busy}>{busy?"Creating…":"Create pending customer"}</AdminButton>
   </form>}
   {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </div>}
 </section>;
}
