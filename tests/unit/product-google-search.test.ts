import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startProductGoogleSearch } from "@/lib/product-google-search";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
const result = { configured: true, results: [{ placeId: "test", name: "Test", formattedAddress: "Test address", reviewUrl: "https://example.com" }] };
function inputs(overrides = {}) {
  return { enabled: true, query: " Test business ", selectedPlaceId: "", onStatus: vi.fn(), onResults: vi.fn(), ...overrides };
}
describe("product business search lifecycle", () => {
  it("debounces and trims requests, preserving ready results", async () => {
    const search = vi.fn().mockResolvedValue(result), args = inputs();
    const stop = startProductGoogleSearch(args, search);
    await vi.advanceTimersByTimeAsync(349);
    expect(search).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(search).toHaveBeenCalledWith("Test business", expect.any(AbortSignal));
    expect(args.onStatus.mock.calls.map(([status]) => status)).toEqual(["loading", "ready"]);
    expect(args.onResults).toHaveBeenCalledWith(result.results);
    stop();
  });

  it("does not send a request while the dialog is closed", async () => {
    const search = vi.fn(), args = inputs({ enabled: false });
    startProductGoogleSearch(args, search);
    await vi.runAllTimersAsync();
    expect(search).not.toHaveBeenCalled();
    expect(args.onStatus).not.toHaveBeenCalled();
  });

  it.each([{ query: "ab" }, { selectedPlaceId: "selected" }])("clears suggestions without searching for %j", async (overrides) => {
    const search = vi.fn(), args = inputs(overrides);
    startProductGoogleSearch(args, search);
    await vi.runAllTimersAsync();
    expect(search).not.toHaveBeenCalled();
    expect(args.onResults).toHaveBeenCalledWith([]);
    expect(args.onStatus).toHaveBeenCalledWith("idle");
  });

  it("cancels the debounce when closing or changing the search", async () => {
    const search = vi.fn(), args = inputs();
    const stop = startProductGoogleSearch(args, search);
    stop();
    await vi.runAllTimersAsync();
    expect(search).not.toHaveBeenCalled();
    expect(args.onResults).not.toHaveBeenCalled();
  });

  it.each([false, true])("ignores late %s responses after cancellation even if transport ignores abort", async (reject) => {
    let finish!: () => void;
    const search = vi.fn().mockImplementation(() => new Promise((resolve, fail) => {
      finish = () => reject ? fail(new Error("late failure")) : resolve(result);
    }));
    const args = inputs(), stop = startProductGoogleSearch(args, search);
    await vi.advanceTimersByTimeAsync(350);
    stop();
    expect(search.mock.calls[0][1].aborted).toBe(true);
    finish();
    await vi.runAllTimersAsync();
    expect(args.onResults).not.toHaveBeenCalled();
    expect(args.onStatus.mock.calls).toEqual([["loading"]]);
  });

  it("allows a new search after reopening", async () => {
    const search = vi.fn().mockResolvedValue(result), args = inputs();
    startProductGoogleSearch(args, search)();
    const stop = startProductGoogleSearch(args, search);
    await vi.advanceTimersByTimeAsync(350);
    expect(search).toHaveBeenCalledTimes(1);
    expect(args.onStatus).toHaveBeenLastCalledWith("ready");
    stop();
  });

  it.each([{ configured: false }, { message: "Manual entry available" }])("retains manual-entry fallback for %j", async (overrides) => {
    const args = inputs(), stop = startProductGoogleSearch(args, vi.fn().mockResolvedValue({ ...result, ...overrides }));
    await vi.advanceTimersByTimeAsync(350);
    expect(args.onStatus).toHaveBeenLastCalledWith("fallback");
    expect(args.onResults).toHaveBeenCalledWith(result.results);
    stop();
  });

  it("handles connection failure without an unhandled rejection", async () => {
    const args = inputs(), stop = startProductGoogleSearch(args, vi.fn().mockRejectedValue(new Error("offline")));
    await vi.advanceTimersByTimeAsync(350);
    expect(args.onStatus).toHaveBeenLastCalledWith("fallback");
    expect(args.onResults).toHaveBeenCalledWith([]);
    stop();
  });
});
