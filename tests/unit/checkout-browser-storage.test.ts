import { afterEach, expect, it, vi } from "vitest";
import { readCheckoutStorage, saveCheckoutStorage } from "@/lib/checkout-browser-storage";
afterEach(() => vi.unstubAllGlobals());
it("degrades to a fresh in-memory checkout when session storage access is blocked", () => {
  vi.stubGlobal("window", { get sessionStorage() { throw new Error("SecurityError"); } });
  expect(readCheckoutStorage("checkout")).toBeNull();
  expect(saveCheckoutStorage("checkout", "session")).toBe(false);
});
it("round-trips a recoverable session and reports quota failures", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  vi.stubGlobal("window", { sessionStorage: storage });
  expect(saveCheckoutStorage("checkout", "session")).toBe(true);
  expect(readCheckoutStorage("checkout")).toBe("session");
  storage.setItem = () => { throw new Error("QuotaExceededError"); };
  expect(saveCheckoutStorage("another", "session")).toBe(false);
  expect(readCheckoutStorage("checkout")).toBe("session");
});
