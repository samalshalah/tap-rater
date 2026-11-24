// Session persistence helps reloads, but is not required to reach payment.
export function readCheckoutStorage(key: string): string | null {
  try { return window.sessionStorage.getItem(key); } catch { return null; }
}

export function saveCheckoutStorage(key: string, value: string): boolean {
  try { window.sessionStorage.setItem(key, value); return true; } catch { return false; }
}
