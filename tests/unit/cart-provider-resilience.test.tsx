import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { customStandItem } from "../helpers/custom-stand";

const hooks = vi.hoisted(() => ({ state: [] as any[], refs: [] as any[], deps: [] as any[], effects: [] as Array<() => void>, s: 0, r: 0, e: 0, track: vi.fn() }));
vi.mock("react", async original => ({
  ...await original<object>(),
  useState: (initial: any) => { const i = hooks.s++; if (!(i in hooks.state)) hooks.state[i] = initial; return [hooks.state[i], (v: any) => { hooks.state[i] = typeof v === "function" ? v(hooks.state[i]) : v; }]; },
  useRef: (initial: any) => hooks.refs[hooks.r++] ??= { current: initial },
  useMemo: (fn: () => unknown) => fn(),
  useEffect: (fn: () => void, deps: unknown[]) => { const i = hooks.e++; if (!hooks.deps[i] || deps.some((v, j) => v !== hooks.deps[i][j])) hooks.effects.push(fn); hooks.deps[i] = deps; },
}));
vi.mock("@/lib/analytics-browser", () => ({ trackEcommerce: hooks.track }));
import { CartProvider } from "@/components/cart/cart-provider";

function render() { hooks.s = hooks.r = hooks.e = 0; return CartProvider({ children: null }).props.value; }
function effects() { const pending = hooks.effects.splice(0); for (const fn of pending) fn(); }
beforeEach(() => {
  hooks.state = []; hooks.refs = []; hooks.deps = []; hooks.effects = []; hooks.track.mockReset();
  vi.stubGlobal("React", React);
});
afterEach(() => vi.unstubAllGlobals());

it("allows adding and using the cart when browser storage is blocked", () => {
  vi.stubGlobal("window", { localStorage: { getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("QuotaExceededError"); } } });
  render();
  expect(effects).not.toThrow();
  render().addItem(customStandItem());
  expect(render().count).toBe(1);
  expect(effects).not.toThrow();
  expect(render().count).toBe(1);
});

it("does not let an analytics failure interrupt adding the configured stand", () => {
  vi.stubGlobal("window", { localStorage: { getItem: () => null, setItem: vi.fn() } });
  render(); effects();
  const cart = render();
  hooks.track.mockImplementation(() => { throw new Error("analytics unavailable"); });
  expect(() => cart.addItem(customStandItem())).not.toThrow();
  expect(render().count).toBe(1);
});
