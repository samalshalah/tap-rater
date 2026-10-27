import type { GridSettings } from "./heatmap-data";

type HistoryScan = {
  tracks: { id: string; settings: GridSettings }[];
  points: { trackId: string; state: string }[];
};

/** Retain API order and first matching track, counting each scan's points once. */
export function buildHeatmapScanHistory<T extends HistoryScan>(scans: T[], trackId: string) {
  return scans.flatMap((scan) => {
    const track = scan.tracks.find((entry) => entry.id === trackId);
    if (!track) return [];
    let completed = 0;
    let total = 0;
    let needsAttention = false;
    for (const point of scan.points) {
      if (point.trackId !== trackId) continue;
      total++;
      if (point.state === "complete") completed++;
      if (point.state === "error" || point.state === "uncertain") needsAttention = true;
    }
    return [{ scan, settings: track.settings, completed, total, needsAttention }];
  });
}
