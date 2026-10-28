/** Public sales naming only; never rewrite historical order snapshots. */
export function brandedProductTitle(title: string): string {
  const clean = title.replace(/\s+/g, " ").trim();
  if (/\bbranded\b/i.test(clean) && /\bQR\b/i.test(clean)) return clean;
  const name = clean.replace(/\b(?:branded|custom)\s+/gi, "").replace(/\bQR\s+/gi, "");
  return /^Tap Rater\s+/i.test(name)
    ? name.replace(/^Tap Rater\s+/i, "Tap Rater Branded QR ")
    : `Branded QR ${name}`;
}
