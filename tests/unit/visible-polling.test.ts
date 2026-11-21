import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startVisiblePolling } from '../../src/lib/visible-polling';

describe('visible polling', () => {
  let doc: EventTarget & { hidden: boolean };
  beforeEach(() => {
    vi.useFakeTimers();
    doc = Object.assign(new EventTarget(), { hidden: false });
    vi.stubGlobal('document', doc);
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  const visibility = (hidden: boolean) => {
    doc.hidden = hidden;
    doc.dispatchEvent(new Event('visibilitychange'));
  };
  it('keeps the visible interval and refreshes on returning from a hidden tab', async () => {
    const refresh = vi.fn();
    const stop = startVisiblePolling(refresh, 60_000);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    visibility(true);
    await vi.advanceTimersByTimeAsync(600_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    visibility(false);
    expect(refresh).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(refresh).toHaveBeenCalledTimes(3);
    stop();
    visibility(false);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(refresh).toHaveBeenCalledTimes(3);
  });
  it('defers an initial read in a hidden tab and avoids overlapping requests', async () => {
    doc.hidden = true;
    let finish!: () => void;
    const refresh = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const stop = startVisiblePolling(refresh, 15_000, true);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(refresh).not.toHaveBeenCalled();
    visibility(false);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    finish();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(refresh).toHaveBeenCalledTimes(2);
    stop();
    finish();
  });
  it('retries after a failed request', async () => {
    const refresh = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const stop = startVisiblePolling(refresh, 15_000, true);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(refresh).toHaveBeenCalledTimes(2);
    stop();
  });
});
