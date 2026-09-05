import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { getStripeClient, getStripeMode } from "@/lib/checkout";
import { processStripeCommerceEvent } from "@/lib/stripe-commerce-processing";
import { withStripeResourceLock } from "@/lib/stripe-processing";
import type { OrdersDbClient } from "@/lib/orders";

export type CommerceRecoveryJob = { id: string; kind: "checkout" | "invoice"; object_id: string; stripe_mode: string;
  status: string; attempts: number; last_error: string | null; updated_at: string };

export async function runCommerceRecovery(event: Stripe.Event, siteUrl: string,
  options: { client?: OrdersDbClient; process?: typeof processStripeCommerceEvent } = {}) {
  const kind = event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded" ? "checkout"
    : event.type === "invoice.paid" || event.type === "invoice.payment_failed" ? "invoice" : null;
  const process = options.process ?? processStripeCommerceEvent;
  if (!kind || (kind === "checkout" && (event.data.object as Stripe.Checkout.Session).payment_status !== "paid")) return process(event, siteUrl);
  if (!options.client && !hasSupabaseAdminConfig()) return NextResponse.json({ error: "Recovery database is unavailable." }, { status: 503 });
  const client = options.client ?? getSupabaseAdmin();
  const mode = getStripeMode();
  if (event.livemode !== undefined && event.livemode !== (mode === "live")) return NextResponse.json({ error: "Stripe event mode does not match." }, { status: 400 });
  const objectId = (event.data.object as Stripe.Checkout.Session | Stripe.Invoice).id;
  const id = `${mode}:${kind}:${objectId}`;
  const result = await withStripeResourceLock(client, `recovery:${id}`, async (assertActive) => {
    const previous = await client.from("commerce_recovery_jobs").select("*").eq("id", id).maybeSingle();
    if (previous.error) return { ok: false, error: "Recovery record could not be read." };
    if (kind === "checkout" && previous.data?.status === "completed") return { ok: true };
    const saved = await client.from("commerce_recovery_jobs").upsert({ id, kind, object_id: objectId, stripe_mode: mode,
      status: "pending", attempts: Number(previous.data?.attempts ?? 0) + 1, last_error: null, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (saved.error) return { ok: false, error: "Recovery record could not be saved." };
    let response: Response;
    try { response = await process(event, siteUrl); }
    catch { response = NextResponse.json({ error: "Payment recovery processing failed." }, { status: 500 }); }
    await assertActive();
    const error = response.ok ? null : String((await response.json().catch(() => null))?.error ?? "Payment recovery failed.").slice(0, 200);
    const completed = await client.from("commerce_recovery_jobs").update({ status: response.ok ? "completed" : "failed", last_error: error,
      updated_at: new Date().toISOString() }).eq("id", id);
    if (completed.error) return { ok: false, error: "Recovery result could not be saved." };
    return response.ok ? { ok: true } : { ok: false, error: error! };
  });
  return result.ok ? NextResponse.json({ received: true }) : NextResponse.json({ error: result.error }, { status: 503 });
}

export async function getCommerceRecoveryJobs() {
  if (!hasSupabaseAdminConfig()) return { available: false, jobs: [] as CommerceRecoveryJob[] };
  const result = await getSupabaseAdmin().from("commerce_recovery_jobs").select("id,kind,object_id,stripe_mode,status,attempts,last_error,updated_at")
    .in("status", ["pending", "failed"]).order("updated_at", { ascending: false }).limit(100);
  return { available: !result.error, jobs: (result.data ?? []) as CommerceRecoveryJob[] };
}

export async function retryCommerceRecovery(id: string) {
  const client = getSupabaseAdmin();
  const result = await client.from("commerce_recovery_jobs").select("*").eq("id", id).maybeSingle();
  if (result.error || !result.data) return NextResponse.json({ error: "Recovery record not found." }, { status: 404 });
  const job = result.data as CommerceRecoveryJob;
  if (job.stripe_mode !== getStripeMode()) return NextResponse.json({ error: "Switching payment modes is not permitted by recovery." }, { status: 409 });
  if (job.status === "completed") return NextResponse.json({ received: true });
  const stripe = getStripeClient();
  const object = job.kind === "checkout" ? await stripe.checkout.sessions.retrieve(job.object_id) : await stripe.invoices.retrieve(job.object_id);
  if (object.livemode !== (job.stripe_mode === "live")) return NextResponse.json({ error: "Stripe object mode does not match." }, { status: 409 });
  const type = job.kind === "checkout" ? "checkout.session.completed" : (object as Stripe.Invoice).status === "paid" ? "invoice.paid" : "invoice.payment_failed";
  return runCommerceRecovery({ id: `recovery:${job.id}`, type, livemode: object.livemode, data: { object } } as unknown as Stripe.Event,
    process.env.NEXT_PUBLIC_SITE_URL || "https://taprater.com");
}
