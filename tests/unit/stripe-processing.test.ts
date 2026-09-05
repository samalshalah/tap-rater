import { describe, expect, it, vi } from "vitest";
import { completeStripeReceipt, hasStripeReceipt, withStripeResourceLock } from "@/lib/stripe-processing";
import { PaymentMemoryDb } from "../helpers/payment-memory-db";

describe("durable Stripe resource processing", () => {
  it("records failures, releases the lease, and permits retry", async () => {
    const client = new PaymentMemoryDb();
    expect(await withStripeResourceLock(client, "payment:pi_a", async () => { throw new Error("network failed"); })).toEqual({ ok: false, error: "network failed" });
    expect(client.table("stripe_processing_locks")[0]).toMatchObject({ last_error: "network failed", attempts: 1 });
    expect(await withStripeResourceLock(client, "payment:pi_a", async guard => { await guard(); return { ok: true }; })).toEqual({ ok: true });
    expect(client.table("stripe_processing_locks")[0]).toMatchObject({ last_error: null, attempts: 2 });
  });

  it("prevents two workers claiming a never-seen resource", async () => {
    const client = new PaymentMemoryDb();
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    const firstWork = vi.fn(async () => { await held; return { ok: true }; });
    const secondWork = vi.fn(async () => ({ ok: true }));
    const first = withStripeResourceLock(client, "payment:pi_race", firstWork);
    const second = withStripeResourceLock(client, "payment:pi_race", secondWork);
    expect(await second).toMatchObject({ ok: false });
    release();
    expect(await first).toMatchObject({ ok: true });
    expect(secondWork).not.toHaveBeenCalled();
  });

  it("recovers an abandoned lease and prevents the old owner from writing after expiry", async () => {
    const client = new PaymentMemoryDb();
    let time = new Date("2026-09-05T00:00:00Z");
    const now = () => time;
    let release!: () => void;
    let started!: () => void;
    const entered = new Promise<void>(resolve => { started = resolve; });
    const held = new Promise<void>(resolve => { release = resolve; });
    const old = withStripeResourceLock(client, "subscription:sub_a", async guard => { started(); await held; await guard(); return { ok: true }; }, { now });
    await entered;
    time = new Date("2026-09-05T00:06:00Z");
    expect(await withStripeResourceLock(client, "subscription:sub_a", async guard => { await guard(); return { ok: true }; }, { now })).toMatchObject({ ok: true });
    release();
    expect(await old).toMatchObject({ ok: false });
  });

  it("does not execute on database lookup errors", async () => {
    const client = new PaymentMemoryDb();
    client.failures.push({ table: "stripe_processing_locks", action: "select", message: "database unavailable" });
    const work = vi.fn();
    expect(await withStripeResourceLock(client, "payment:pi_a", work)).toMatchObject({ ok: false });
    expect(work).not.toHaveBeenCalled();
  });

  it("does not report completion when a receipt cannot be written", async () => {
    const client = new PaymentMemoryDb();
    client.failures.push({ table: "stripe_events", action: "insert", message: "receipt unavailable" });
    await expect(completeStripeReceipt(client, "evt_a:v2", "invoice.paid")).rejects.toThrow();
    expect(await hasStripeReceipt(client, "evt_a:v2")).toBe(false);
    await completeStripeReceipt(client, "evt_a:v2", "invoice.paid");
    expect(await hasStripeReceipt(client, "evt_a:v2")).toBe(true);
  });
});
