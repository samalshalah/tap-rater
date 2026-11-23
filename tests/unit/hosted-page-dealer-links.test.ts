import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getHostedButtonMark, supportedHostedPageButtons } from "@/lib/hosted-page-editor-shared";
import { buildSnapshotFromDraft, renderHostedPageDraftPreview } from "@/lib/hosted-page-editor-draft";
import type { HostedPageEditorRecord } from "@/lib/hosted-page-editor-shared";

const dealerTypes = ["dealerrater", "cars_com", "cargurus", "edmunds", "autotrader", "carfax", "bbb"] as const;
const socialTypes = ["youtube", "tiktok", "x", "linkedin"] as const;
const typesWithLogos = ["dealerrater", "cars_com", "cargurus", "edmunds", "carfax", "youtube", "tiktok", "x", "linkedin"] as const;

function page(types: readonly string[]): HostedPageEditorRecord {
  return {
    id: "page-1", customerId: "c-1", customerEmail: "owner@example.com", businessId: "b-1", businessName: "Main Street Motors",
    code: "ABCDEFGHJKM2", lifecycleStatus: "ACTIVE",
    draft: {
      businessName: "Main Street Motors",
      appearance: { theme: "light", accentColor: "#0f766e" },
      buttons: types.map((type, position) => ({ id: `${type}-id`, type: type as never, label: "", url: `https://example.com/${type}`, enabled: true, position }))
    }
  };
}

describe("dealer and social Multi-Link buttons", () => {
  it("offers each dealer review site as a review link and each social as a social link", () => {
    for (const type of dealerTypes) expect(supportedHostedPageButtons.find((item) => item.type === type)?.snapshotType).toBe("review");
    for (const type of socialTypes) expect(supportedHostedPageButtons.find((item) => item.type === type)?.snapshotType).toBe("social");
  });

  it("gives every new type its own brand mark instead of the generic link", () => {
    for (const type of [...dealerTypes, ...socialTypes]) {
      expect(getHostedButtonMark(type).brand).not.toBe("Custom link");
    }
  });

  it("uses the official logo file for each brand that has one", () => {
    for (const type of typesWithLogos) {
      const logo = getHostedButtonMark(type).logo ?? "";
      expect(logo).toMatch(/^\/brand\/multilink\/[a-z-]+\.png$/);
      expect(existsSync(join(process.cwd(), "public", logo))).toBe(true);
    }
    expect(getHostedButtonMark("bbb").logo).toBeUndefined();
  });

  it("publishes a dealer page with the brand label, icon key and logo kept", () => {
    const snapshot = buildSnapshotFromDraft(page(["google_review", "dealerrater", "cars_com", "cargurus"]));
    expect(snapshot.buttons.map((button) => button.iconKey)).toEqual(["google_review", "dealerrater", "cars_com", "cargurus"]);
    expect(snapshot.buttons[1]).toMatchObject({ label: "DealerRater", type: "review" });
    const html = renderHostedPageDraftPreview(page(["dealerrater", "youtube"]));
    expect(html).toContain('aria-label="DealerRater"');
    expect(html).toContain('src="/brand/multilink/dealerrater.png"');
    expect(html).toContain('aria-label="YouTube"');
  });
});
