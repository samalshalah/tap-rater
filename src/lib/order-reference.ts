export function formatOrderReference(reference: string | null | undefined) {
  const value = reference?.trim();
  if (!value) return "TR-ORDER";
  if (/^TR-\d{6}-[A-Z0-9]{6}$/i.test(value)) return value.toUpperCase();

  if (value.startsWith("manual_")) {
    return `TR-${shortHash(value)}`;
  }

  return value;
}

export function createManualOrderReference(now = new Date()) {
  const datePart = [
    String(now.getUTCFullYear()).slice(-2),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0")
  ].join("");

  return `TR-${datePart}-${createOrderRandomPart()}`;
}

function createOrderRandomPart() {
  try {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  } catch {
    return Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "0");
  }
}

function shortHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
}
