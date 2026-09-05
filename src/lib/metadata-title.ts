export function withoutSiteTitleSuffix(title: string) {
  return title.replace(/(?:\s*\|\s*Tap Rater)+\s*$/i, "").trim();
}
