import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buildHeatmapScanHistory } from "@/lib/heatmap-scan-history";
import { HeatmapScanHistory } from "@/components/account/heatmap-scan-history";
import type { Scan } from "@/components/account/location-heatmap-types";

const settings = { keyword: "coffee", size: 3 as const, spacingKm: 0.5 as const, language: "en" as const };
function scan(id: string, states: string[], trackId = "a"): Scan {
  return {
    id, methodology: "maps-v2", period: "2026-10-26", submitted_at: "2026-10-27T12:00:00Z",
    anchor: { title: "Test", placeId: "place", latitude: 38.9, longitude: -77.1, centerSource: "selected", synced_at: "2026-10-27T12:00:00Z" },
    tracks: [{ id: trackId, version: 1, settings }],
    points: states.map((state, index) => ({ trackId, state, index, rank: null, count: null }))
  };
}

describe("saved heatmap scan history", () => {
  it("preserves supplied order, references, and original saved settings", () => {
    const latest = scan("latest", ["complete", "queued"]), old = scan("old", ["complete"]);
    old.tracks[0].settings = { ...settings, size: 7, spacingKm: 2 };
    const input = [latest, scan("other-keyword", ["error"], "b"), old];
    const before = structuredClone(input);
    const result = buildHeatmapScanHistory(input, "a");
    expect(result.map((entry) => entry.scan.id)).toEqual(["latest", "old"]);
    expect(result[0].scan).toBe(latest);
    expect(result[1].settings).toBe(old.tracks[0].settings);
    expect(input).toEqual(before);
  });

  it("isolates keyword counts and preserves duplicate point counting", () => {
    const saved = scan("mixed", ["complete", "error", "uncertain", "pending", "submitting", "queued"]);
    saved.points.push({ ...saved.points[0] }, { ...saved.points[0], trackId: "b" });
    expect(buildHeatmapScanHistory([saved], "a")[0]).toMatchObject({ completed: 2, total: 7, needsAttention: true });
  });

  it("uses the first track when duplicate track IDs occur", () => {
    const saved = scan("duplicates", []);
    saved.tracks.push({ id: "a", version: 2, settings: { ...settings, size: 7 } });
    expect(buildHeatmapScanHistory([saved], "a")[0].settings).toBe(saved.tracks[0].settings);
  });

  it("handles empty histories, unmatched keywords and scans without points", () => {
    expect(buildHeatmapScanHistory([], "a")).toEqual([]);
    expect(buildHeatmapScanHistory([scan("unmatched", [], "b")], "a")).toEqual([]);
    expect(buildHeatmapScanHistory([scan("empty", [])], "a")[0]).toMatchObject({ completed: 0, total: 0, needsAttention: false });
    expect(buildHeatmapScanHistory([scan("pending", ["queued", "pending", "submitting"])], "a")[0].needsAttention).toBe(false);
  });

  it("matches the old history calculations across mixed historical snapshots", () => {
    const scans = Array.from({ length: 40 }, (_, i) => {
      const saved = scan(String(i), Array.from({ length: 49 }, (_, n) => ["complete", "queued", "error", "uncertain"][n % 4]));
      saved.points.push(...scan("b", ["complete", "error"], "b").points);
      if (i % 3 === 0) saved.tracks = [{ id: "b", version: 1, settings }];
      return saved;
    });
    const legacy = scans.filter((s) => s.tracks.some((t) => t.id === "a")).map((s) => ({
      scan: s, settings: s.tracks.find((t) => t.id === "a")!.settings,
      completed: s.points.filter((p) => p.trackId === "a").filter((p) => p.state === "complete").length,
      total: s.points.filter((p) => p.trackId === "a").length,
      needsAttention: s.points.filter((p) => p.trackId === "a").some((p) => ["error", "uncertain"].includes(p.state))
    }));
    expect(buildHeatmapScanHistory(scans, "a")).toEqual(legacy);
  });

  it("reads each point's keyword once, rather than three separate passes", () => {
    let reads = 0;
    const points = Array.from({ length: 147 }, (_, i) => ({ get trackId() { reads++; return i % 3 ? "b" : "a"; }, state: "complete" }));
    expect(buildHeatmapScanHistory([{ tracks: [{ id: "a", settings }], points }], "a")[0].total).toBe(49);
    expect(reads).toBe(147);
  });

  it("renders historical labels, attention state and disabled editing without losing options", () => {
    const old = scan("legacy", ["complete", "uncertain"]);
    old.methodology = "legacy";
    const html = renderToStaticMarkup(<HeatmapScanHistory scans={[old]} selected="a" settings={settings} distanceUnit="mi" editing dirty={false} scanId="legacy" onChange={() => {}} />);
    expect(html).toContain("Latest matching settings");
    expect(html).toContain('value="legacy" selected=""');
    expect(html).toContain("Older scan · not comparable");
    expect(html).toContain("1/2 points complete · Needs attention");
    expect(html).toContain('disabled=""');
    expect(html).toContain("mi spacing");
  });
});
