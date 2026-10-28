/** Public sales naming only; never rewrite historical order snapshots. */
export function shortProductTitle(title: string): string {
  let name = title.replace(/\s+/g, " ").trim()
    .replace(/\s*(?:—|–|-)\s*NFC\s*\+\s*QR(?: Code)?$/i, "")
    .replace(/\s+with (?:Your Logo|Logo, NFC & QR)$/i, "")
    .replace(/\s*\|.*$/, "")
    .replace(/^Tap Rater\s+/i, "")
    .replace(/^(?:(?:Branded|Custom|QR)\s+)+/i, "");
  name = name.replace(/^(Review|Follow|Channel|Message|Connect) (Stand|Plate) for (.+)$/i,
    (_, action: string, format: string, platform: string) => `${platform.replace(/\s+Reviews$/i, "")} ${action} ${format}`);
  const names: Record<string, string> = {
    "Rate Your Experience Stand": "Customer Feedback Stand",
    "Follow Us on Social Media Stand": "Social Media Follow Stand",
    "Check Our Information Stand": "Business Information Stand",
    "Explore Our Services Stand": "Business Services Stand",
    "Connect With Us Stand": "Business Contact Stand",
    "Book Your Next Visit Stand": "Appointment Booking Stand",
    "View Our Menu Stand": "Menu Stand",
    "Visit Our Website Stand": "Website Stand"
  };
  return `Custom ${names[name] ?? name}`;
}

export function brandedProductTitle(title: string): string {
  return `${shortProductTitle(title)} with Your Logo — NFC + QR`;
}

/** The root metadata template adds the Tap Rater brand once. */
export function brandedProductSeoTitle(title: string): string {
  return `${shortProductTitle(title)} with Logo, NFC & QR`;
}
