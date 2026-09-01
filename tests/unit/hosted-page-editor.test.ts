import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSnapshotFromDraft,
  getHostedPageEditorContext,
  hostedPageButtonLimit,
  publishHostedPageDraft,
  renderHostedPageDraftPreview,
  saveHostedPageDraft,
  validateHostedPageEditorDraft
} from "@/lib/hosted-page-editor";
import type { HostedPagePutOptions, HostedPageTextStorage } from "@/lib/hosted-pages/repository";

describe("hosted page editor", () => {
  let tempRoot = "";

  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "tap-rater-editor-test-"));
    process.env.TAP_RATER_LOCAL_HOSTED_EDITOR_FILE = join(tempRoot, "editor.json");
    process.env.NEXT_PUBLIC_SITE_URL = "https://taprater.com";
    process.env.ADMIN_EMAIL = "qa-customer@example.com";
  });

  afterEach(async () => {
    delete process.env.TAP_RATER_LOCAL_HOSTED_EDITOR_FILE;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.ADMIN_EMAIL;
    await rm(tempRoot, { recursive: true, force: true });
    vi.useRealTimers();
  });

  it("loads only the hosted page owned by the signed-in customer email", async () => {
    const owner = await getHostedPageEditorContext("qa-customer@example.com");
    const other = await getHostedPageEditorContext("other@example.com");

    expect(owner.configured && owner.page?.code).toBe("ABCDEFGHJKM2");
    expect(other.configured && other.page).toBeNull();
  });

  it("saves a draft without publishing or changing the permanent code", async () => {
    const pageBefore = await getOwnedPage();
    const updated = await saveHostedPageDraft("qa-customer@example.com", {
      ...pageBefore.draft,
      businessName: "Draft Only Cafe",
      buttons: pageBefore.draft.buttons.map((button) => (button.type === "instagram" ? { ...button, enabled: true, url: "https://example.com/ig" } : button))
    });

    expect(updated.code).toBe(pageBefore.code);
    expect(updated.publishedVersion).toBeUndefined();
    expect(updated.draft.businessName).toBe("Draft Only Cafe");

    const reloaded = await getOwnedPage();
    expect(reloaded.draft.businessName).toBe("Draft Only Cafe");
  });

  it("rejects unsafe URLs, unsupported button types, invalid appearance, and excess buttons", () => {
    const base = validateHostedPageEditorDraft({
      businessName: "Valid Business",
      appearance: { theme: "light", accentColor: "#0f766e" },
      buttons: [{ id: "one", type: "website", label: "Website", url: "https://example.com", enabled: true, position: 0 }]
    });

    expect(() =>
      validateHostedPageEditorDraft({
        ...base,
        buttons: [{ id: "bad", type: "website", label: "Website", url: "javascript:alert(1)", enabled: true, position: 0 }]
      })
    ).toThrow("must start with http or https");

    expect(() =>
      validateHostedPageEditorDraft({
        ...base,
        buttons: [{ id: "bad", type: "unsupported", label: "Bad", url: "https://example.com", enabled: true, position: 0 }]
      })
    ).toThrow("Unsupported button type");

    expect(() => validateHostedPageEditorDraft({ ...base, appearance: { theme: "custom", accentColor: "#0f766e" } })).toThrow("Unsupported page style");
    expect(() => validateHostedPageEditorDraft({ ...base, buttons: Array.from({ length: hostedPageButtonLimit + 1 }, (_, index) => ({ ...base.buttons[0], id: `b-${index}`, position: index })) })).toThrow("or fewer buttons");
  });

  it("builds preview HTML from the same draft structure used for publishing", async () => {
    const page = await getOwnedPage();
    const nextDraft = validateHostedPageEditorDraft({
      ...page.draft,
      businessName: "Preview Cafe",
      buttons: [
        { id: "website", type: "website", label: "Website", url: "https://example.com", enabled: true, position: 0 },
        { id: "google", type: "google_review", label: "Google Review", url: "https://example.com/review", enabled: true, position: 1 }
      ]
    });

    const snapshot = buildSnapshotFromDraft({ ...page, draft: nextDraft }, new Date("2026-08-23T12:00:00.000Z"));
    const html = renderHostedPageDraftPreview({ ...page, draft: nextDraft });

    expect(snapshot.businessName).toBe("Preview Cafe");
    expect(snapshot.buttons.map((button) => button.label)).toEqual(["Website", "Google Review"]);
    expect(html).toContain("Preview Cafe");
    expect(html).toContain("Website");
    expect(html).toContain("Google Review");
  });

  it("renders setup preview before the customer has completed any links", async () => {
    const page = await getOwnedPage();
    const nextDraft = validateHostedPageEditorDraft({
      ...page.draft,
      businessName: "Skipped Links Cafe",
      logoUrl: "/api/media/product/products/customer-setup/logo.png",
      headline: "",
      description: "",
      buttons: []
    });

    const html = renderHostedPageDraftPreview({ ...page, draft: nextDraft });

    expect(html).toContain("Skipped Links Cafe");
    expect(html).toContain("This Tap Rater page is being set up");
    expect(() => buildSnapshotFromDraft({ ...page, draft: nextDraft })).toThrow("Add at least one valid link");
  });

  it("publishes through the Milestone 5 storage contract and preserves the previous public version on failure", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-23T12:00:00.000Z"));
    const storage = new MemoryHostedStorage();

    await saveHostedPageDraft("qa-customer@example.com", {
      businessName: "Published Cafe",
      appearance: { theme: "light", accentColor: "#0f766e" },
      buttons: [{ id: "website", type: "website", label: "Website", url: "https://example.com", enabled: true, position: 0 }]
    });

    const first = await publishHostedPageDraft("qa-customer@example.com", storage);
    expect(first.snapshot.code).toBe("ABCDEFGHJKM2");
    expect(first.snapshot.businessName).toBe("Published Cafe");
    expect(storage.currentVersion()).toBe(first.snapshot.version);

    await saveHostedPageDraft("qa-customer@example.com", {
      ...first.page.draft,
      businessName: "Failed Publish Cafe"
    });
    storage.failCurrentPromotion = true;
    await expect(publishHostedPageDraft("qa-customer@example.com", storage)).rejects.toThrow();
    expect(storage.currentVersion()).toBe(first.snapshot.version);

    const reloaded = await getOwnedPage();
    expect(reloaded.draft.businessName).toBe("Failed Publish Cafe");
  });
});

async function getOwnedPage() {
  const context = await getHostedPageEditorContext("qa-customer@example.com");
  if (!context.configured || !context.page) throw new Error("Expected local QA page.");
  return context.page;
}

class MemoryHostedStorage implements HostedPageTextStorage {
  readonly objects = new Map<string, string>();
  failCurrentPromotion = false;

  async getText(key: string) {
    return this.objects.get(key) ?? null;
  }

  async putText(key: string, value: string, _options?: HostedPagePutOptions) {
    if (this.failCurrentPromotion && key.endsWith("/current.json")) {
      throw new Error("Simulated current pointer failure.");
    }
    this.objects.set(key, value);
  }

  async putTextIfAbsent(key: string, value: string, _options?: HostedPagePutOptions) {
    if (this.objects.has(key)) return false;
    this.objects.set(key, value);
    return true;
  }

  currentVersion() {
    const current = this.objects.get("hosted-pages/ABCDEFGHJKM2/current.json");
    return current ? JSON.parse(current).currentVersion : undefined;
  }
}
