import { describe, expect, it } from "vitest";
import { assignPermanentHostedPageCode, publishHostedPageSnapshot } from "../../../src/lib/hosted-pages/repository";
import { createR2HostedPageStorage, type HostedPageR2Bucket } from "../../../src/lib/hosted-pages/r2-storage";
import type { HostedPageSnapshot } from "../../../src/lib/hosted-pages/snapshots";
import { handleHostedPageRequest } from "./index";

const hostedCode = "ABCDEFGHJKM2";

describe("hosted page Worker", () => {
  it("renders published pages from R2 snapshots without database access", async () => {
    const bucket = new MemoryR2Bucket();
    const storage = createR2HostedPageStorage(bucket);
    await assignPermanentHostedPageCode(storage, { physicalProductRef: "physical-product-1", code: hostedCode });
    await publishHostedPageSnapshot(storage, sampleSnapshot({ version: "v1", businessName: "Worker Cafe" }));

    const response = await handleHostedPageRequest(
      new Request(`https://taprater.com/p/${hostedCode}`),
      { HOSTED_PAGE_SNAPSHOTS: bucket as unknown as R2Bucket, ENVIRONMENT: "production" },
      new TestExecutionContext()
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Tap-Rater-Hosted-Page-State")).toBe("available");
    await expect(response.text()).resolves.toContain("Worker Cafe");
  });

  it("returns a branded unknown page for unknown codes", async () => {
    const response = await handleHostedPageRequest(
      new Request("https://taprater.com/p/BCDEFGHJKM23"),
      { HOSTED_PAGE_SNAPSHOTS: new MemoryR2Bucket() as unknown as R2Bucket, ENVIRONMENT: "production" },
      new TestExecutionContext()
    );

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toContain("Tap Rater page not found");
  });

  it("serves cached last-known-good HTML when R2 delivery fails", async () => {
    const bucket = new MemoryR2Bucket();
    const storage = createR2HostedPageStorage(bucket);
    await assignPermanentHostedPageCode(storage, { physicalProductRef: "physical-product-1", code: hostedCode });
    await publishHostedPageSnapshot(storage, sampleSnapshot({ version: "v1", businessName: "Cached Cafe" }));

    const cache = new MemoryCache();
    const ctx = new TestExecutionContext();
    const request = new Request(`https://taprater.com/p/${hostedCode}`);
    const first = await handleHostedPageRequest(
      request,
      { HOSTED_PAGE_SNAPSHOTS: bucket as unknown as R2Bucket, ENVIRONMENT: "production" },
      ctx,
      cache as unknown as Cache
    );
    await Promise.all(ctx.promises);
    expect(first.status).toBe(200);

    const brokenBucket = new MemoryR2Bucket();
    brokenBucket.failReads = true;
    const fallback = await handleHostedPageRequest(
      request,
      { HOSTED_PAGE_SNAPSHOTS: brokenBucket as unknown as R2Bucket, ENVIRONMENT: "production" },
      new TestExecutionContext(),
      cache as unknown as Cache
    );

    expect(fallback.status).toBe(200);
    expect(fallback.headers.get("X-Tap-Rater-Hosted-Page-Source")).toBe("cache-last-known-good");
    await expect(fallback.text()).resolves.toContain("Cached Cafe");
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

class MemoryR2Bucket implements HostedPageR2Bucket {
  readonly objects = new Map<string, string>();
  failReads = false;

  async get(key: string) {
    if (this.failReads) throw new Error("R2 read failed.");
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

class MemoryCache {
  private readonly responses = new Map<string, Response>();

  async match(request: Request) {
    return this.responses.get(request.url);
  }

  async put(request: Request, response: Response) {
    this.responses.set(request.url, response);
  }
}

class TestExecutionContext implements ExecutionContext {
  readonly promises: Promise<unknown>[] = [];
  readonly exports = {} as Cloudflare.Exports;
  readonly props = {};
  readonly tracing = {
    enterSpan: <T, A extends unknown[]>(_name: string, callback: (span: Span, ...args: A) => T, ...args: A) => callback(this.createSpan(), ...args),
    startActiveSpan: <T, A extends unknown[]>(_name: string, callback: (span: Span, ...args: A) => T, ...args: A) => callback(this.createSpan(), ...args),
    Span: TestSpan as typeof Span
  };

  waitUntil(promise: Promise<unknown>) {
    this.promises.push(promise);
  }

  passThroughOnException() {}

  abort(reason?: unknown) {
    throw reason instanceof Error ? reason : new Error("Test execution context aborted.");
  }

  private createSpan() {
    return new TestSpan() as Span;
  }
}

class TestSpan {
  get isTraced() {
    return false;
  }

  setAttribute() {}

  end() {}
}
