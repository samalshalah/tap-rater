export type DistanceUnit = 'km' | 'mi';

// Presentation only: grid settings and scan payloads always remain in kilometres.
export function formatHeatmapDistance(kilometres: number, unit: DistanceUnit): string {
  const value = unit === 'mi' ? kilometres / 1.609344 : kilometres;
  return Number(value.toFixed(3)).toString();
}
