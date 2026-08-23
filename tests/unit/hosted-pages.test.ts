import { describe, expect, it } from "vitest";
import { createHostedPageCode, isValidHostedPageCode } from "@/lib/hosted-pages/codes";
import {
  assignPermanentHostedPageCode,
  publishHostedPageSnapshot,
  readCurrentHostedPageSnapshot,
  rollbackHostedPageSnapshot,
  type HostedPagePutOptions,
  type HostedPageTextStorage
} from "@/lib/hosted-pages/repository";
import { createR2HostedPageStorage, type HostedPageR2Bucket } from "@/lib/hosted-pages/r2-storage";
import {
  resolveHostedPageLifecycle,
  validateHostedPageSnapshot,
  type HostedPageSnapshot
} from "@/lib/hosted-pages/snapshots";

const hostedCode = "ABCDEFGHJKM2";

describe("hosted page codes", () => {
  it("generates opaque URL-safe permanent codes", () => {
    const codes = Array.from({ length: 250 }, () => createHostedPageCode());

    expect(codes.every(isValidHostedPageCode)).toBe(true);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => !/^[0-9]+$/.test(code))).toBe(true);
  });
});

describe("hosted page snapshot validation and lifecycle", () => {
  it("accepts only public button data and safe public URLs", () => {
    const snapshot = sampleSnapshot();
    expect(validateHostedPageSnapshot(snapshot)).toMatchObject({ code: hostedCode, businessName: "Cafe One" });

    expect(() =>
      validateHostedPageSnapshot({
        ...snapshot,
        buttons: [{ id: "unsafe", label: "Unsafe", type: "custom", url: "javascript:alert(1)" }]
      })
    ).toThrow("URL must be HTTP or HTTPS");
  });

  it("keeps active subscription lifecycle states available and expired states inactive", () => {
    const now = new Date("2026-08-23T12:00:00.000Z");

    expect(resolveHostedPageLifecycle(sampleSnapshot({ lifecycleStatus: "ACTIVE" }), now).state).toBe("available");
    expect(resolveHostedPageLifecycle(sampleSnapshot({ lifecycleStatus: "REACTIVATED" }), now).state).toBe("available");
    expect(
      resolveHostedPageLifecycle(
        sampleSnapshot({
          lifecycleStatus: "PAST_DUE",
          subscriptionPastDueSince: "2026-08-20T12:00:00.000Z"
        }),
        now
      ).state
    ).toBe("available");
    expect(
      resolveHostedPageLifecycle(
        sampleSnapshot({
          lifecycleStatus: "PAST_DUE",
          subscriptionPastDueSince: "2026-08-01T12:00:00.000Z"
        }),
        now
      )
    ).toMatchObject({ state: "inactive", reason: "past_due_grace_expired" });
    expect(
      resolveHostedPageLifecycle(
        sampleSnapshot({
          lifecycleStatus: "CANCELLED_AT_PERIOD_END",
          subscriptionPaidThrough: "2026-08-24T12:00:00.000Z"
        }),
        now
      ).state
    ).toBe("available");
    expect(
      resolveHostedPageLifecycle(
        sampleSnapshot({
          lifecycleStatus: "CANCELLED_AT_PERIOD_END",
          subscriptionPaidThrough: "2026-08-22T12:00:00.000Z"
        }),
        now
      )
    ).toMatchObject({ state: "inactive", reason: "cancelled_period_ended" });
    expect(resolveHostedPageLifecycle(sampleSnapshot({ lifecycleStatus: "EXPIRED" }), now).state).toBe("inactive");
    expect(resolveHostedPageLifecycle(sampleSnapshot({ lifecycleStatus: "RETIRED_INTERNAL" }), now).state).toBe("inactive");
  });
});

describe("hosted page repository", () => {
  it("assigns each physical product one immutable permanent code", async () => {
    const storage = new MemoryHostedPageStorage();
    const first = await assignPermanentHostedPageCode(storage, {
      physicalProductRef: "order_1:item_1",
      code: hostedCode,
      now: new Date("2026-08-23T00:00:00.000Z")
    });
    const second = await assignPermanentHostedPageCode(storage, {
      physicalProductRef: "order_1:item_1",
      code: "BCDEFGHJKM23",
      now: new Date("2026-08-23T00:00:01.000Z")
    });

    expect(second).toEqual(first);
    await expect(
      assignPermanentHostedPageCode(storage, {
        physicalProductRef: "order_2:item_1",
        code: hostedCode
      })
    ).rejects.toThrow("already assigned");
  });

  it("publishes versioned snapshots, preserves last-known-good on failed publish, and rolls back", async () => {
    const storage = new MemoryHostedPageStorage();
    await assignPermanentHostedPageCode(storage, { physicalProductRef: "physical-product-1", code: hostedCode });

    await publishHostedPageSnapshot(storage, sampleSnapshot({ version: "v1", businessName: "Version One" }));
    await publishHostedPageSnapshot(storage, sampleSnapshot({ version: "v2", businessName: "Version Two" }));
    expect(await readCurrentHostedPageSnapshot(storage, hostedCode)).toMatchObject({ version: "v2", businessName: "Version Two" });

    storage.failOnPutKey = `hosted-pages/${hostedCode}/current.json`;
    await expect(publishHostedPageSnapshot(storage, sampleSnapshot({ version: "v3", businessName: "Broken Publish" }))).rejects.toThrow();
    storage.failOnPutKey = undefined;
    expect(await readCurrentHostedPageSnapshot(storage, hostedCode)).toMatchObject({ version: "v2", businessName: "Version Two" });

    await rollbackHostedPageSnapshot(storage, hostedCode, "v1");
    expect(await readCurrentHostedPageSnapshot(storage, hostedCode)).toMatchObject({ version: "v1", businessName: "Version One" });
  });
});

function sampleSnapshot(overrides: Partial<HostedPageSnapshot> = {}): HostedPageSnapshot {
  return {
    schemaVersion: 1,
    code: hostedCode,
    version: "v1",
    publishedAt: "2026-08-23T00:00:00.000Z",
    lifecycleStatus: "ACTIVE",
    businessName: "Cafe One",
    headline: "Choose your next step",
    description: "Public multi-link page",
    buttons: [
      {
        id: "google",
        label: "Review us on Google",
        type: "review",
        url: "https://example.com/review"
      }
    ],
    appearance: {
      accentColor: "#0f766e"
    },
    ...overrides
  };
}

class MemoryHostedPageStorage implements HostedPageTextStorage {
  readonly objects = new Map<string, string>();
  failOnPutKey?: string;

  async getText(key: string) {
    return this.objects.get(key) ?? null;
  }

  async putText(key: string, value: string, _options?: HostedPagePutOptions) {
    if (key === this.failOnPutKey) throw new Error("Simulated storage failure.");
    this.objects.set(key, value);
  }

  async putTextIfAbsent(key: string, value: string, _options?: HostedPagePutOptions) {
    if (key === this.failOnPutKey) throw new Error("Simulated storage failure.");
    if (this.objects.has(key)) return false;
    this.objects.set(key, value);
    return true;
  }
}

class MemoryR2Bucket implements HostedPageR2Bucket {
  readonly objects = new Map<string, string>();

  async get(key: string) {
    const value = this.objects.get(key);
    return value === undefined ? null : { text: async () => value };
  }

  async put(key: string, value: string, options?: { onlyIf?: Headers }) {
    if (options?.onlyIf?.get("If-None-Match") === "*" && this.objects.has(key)) {
      return null;
    }

    this.objects.set(key, value);
    return {};
  }
}
