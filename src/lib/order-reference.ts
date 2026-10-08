export function formatOrderReference(reference: string | null | undefined) {
  const value = reference?.trim();
  if (!value) return "Pending";
  if (/^[A-Z0-9]{10}$/i.test(value)) return value.toUpperCase();

  // A stable display reference shared by customer pages, email and admin search.
  // Keep the full original ID for database lookups, payment reconciliation and
  // authorization; this shortened reference is never a database or access key.
  const normalized = /^TR-\d{6}-[A-Z0-9]{6}$/i.test(value) ? value.toUpperCase() : value;
  return shortHash(normalized);
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
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return (hash % (36n ** 10n)).toString(36).toUpperCase().padStart(10, "0");
}
