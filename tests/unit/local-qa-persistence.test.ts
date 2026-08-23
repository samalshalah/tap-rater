import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { createLocalQaOrdersAdapter, getLocalQaOrdersFileFromEnv } from "@/lib/local-qa-persistence";

const cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("local QA persistence", () => {
  it("is opt-in and disabled in production", () => {
    expect(getLocalQaOrdersFileFromEnv({ TAP_RATER_LOCAL_ORDERS_FILE: "tmp/orders.json", NODE_ENV: "development" })).toContain("orders.json");
    expect(getLocalQaOrdersFileFromEnv({ TAP_RATER_LOCAL_ORDERS_FILE: "tmp/orders.json", NODE_ENV: "production" })).toBeUndefined();
    expect(getLocalQaOrdersFileFromEnv({ NODE_ENV: "development" })).toBeUndefined();
  });

  it("persists orders through the Supabase-shaped repository contract", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tap-rater-local-qa-"));
    cleanupPaths.push(dir);
    const adapter = createLocalQaOrdersAdapter(join(dir, "orders.json"));

    await adapter.from("orders").upsert({
      id: "qa-order-1",
      stripe_checkout_session_id: "cs_test_qa_1",
      status: "paid",
      created_at: "2026-08-23T12:00:00.000Z"
    });

    await adapter.from("orders").update({ shipping_status: "ready_to_ship" }).eq("id", "qa-order-1");

    await expect(adapter.from("orders").select("*").eq("id", "qa-order-1").maybeSingle()).resolves.toMatchObject({
      data: {
        id: "qa-order-1",
        shipping_status: "ready_to_ship",
        stripe_checkout_session_id: "cs_test_qa_1"
      },
      error: null
    });
  });
});
