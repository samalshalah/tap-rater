// Hidden tabs must not keep the database awake. Returning to a tab refreshes
// immediately; visible tabs retain their existing interval.
export function startVisiblePolling(
  refresh: () => void | Promise<unknown>,
  intervalMs: number,
  immediately = false,
) {
  let stopped = false;
  let running = false;
  const poll = async () => {
    if (stopped || document.hidden || running) return;
    running = true;
    try {
      await refresh();
    } catch {
      // Callers display their own errors; the next visible poll can retry.
    } finally {
      running = false;
    }
  };
  const visible = () => { if (!document.hidden) void poll(); };
  const timer = setInterval(() => void poll(), intervalMs);
  document.addEventListener("visibilitychange", visible);
  if (immediately) void poll();
  return () => {
    stopped = true;
    clearInterval(timer);
    document.removeEventListener("visibilitychange", visible);
  };
}
