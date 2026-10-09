"use client";

import { useEffect, useState } from "react";
import type { LiveAnalytics } from "@/lib/live-analytics";

const labels: Record<string, string> = {
  page_view: "Viewed page",
  view_item: "Viewed product",
  add_to_cart: "Added to cart",
  view_cart: "Viewed cart",
  begin_checkout: "Started checkout",
  add_shipping_info: "Submitted shipping",
  payment_step: "Reached payment",
  add_payment_info: "Submitted payment",
  purchase: "Confirmed purchase",
  checkout_error: "Checkout error",
  payment_error: "Payment error",
};

export function LiveAnalyticsPanel() {
  const [data, setData] = useState<LiveAnalytics | null>(null);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (paused) return;
    let disposed = false;
    let busy = false;
    let controller: AbortController | null = null;
    const refresh = async () => {
      if (document.hidden || busy) return;
      busy = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 10000);
      try {
        const response = await fetch("/api/admin/analytics/live", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? "Sign in again to view live activity."
              : "Unable to refresh. Retrying automatically; any figures below are from the last successful update.",
          );
        const next: LiveAnalytics = await response.json();
        if (!disposed) {
          setData(next);
          setError("");
        }
      } catch (cause) {
        if (!disposed)
          setError(
            cause instanceof Error && cause.name !== "AbortError"
              ? cause.message
              : "Live activity timed out. Retrying automatically.",
          );
      } finally {
        clearTimeout(timeout);
        busy = false;
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    const visible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      disposed = true;
      clearInterval(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", visible);
    };
  }, [paused]);
  const count = data?.active.reduce((sum, row) => sum + row.sessions, 0);
  return (
    <section
      id="live"
      className="rounded-xl border border-line bg-white p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Live activity</h2>
          <p className="text-sm text-muted mt-2">
            Refreshes every 15 seconds while this tab is visible. Includes
            consented activity and excludes testing.
          </p>
        </div>
        <button
          className="tr-button-outline"
          onClick={() => setPaused(!paused)}
        >
          {paused ? "Resume live updates" : "Pause live updates"}
        </button>
      </div>
      <p role="status" className="text-sm text-muted">
        {paused ? "Paused" : "Auto-refresh on"} ·{" "}
        {data
          ? `Last updated ${new Date(data.updatedAt).toLocaleTimeString()}`
          : "Waiting for first update"}
      </p>
      {error && (
        <p role="alert" className="tr-status-warning">
          {error}
        </p>
      )}
      <div>
        <p className="text-sm text-muted">Active sessions · last 5 minutes</p>
        <p className="text-3xl font-semibold mt-1">{count ?? "—"}</p>
        <p className="text-xs text-muted mt-2">
          An estimate from recent actions, not a count of people currently
          online. One person can have multiple sessions. Pages below are the
          last observed page.
        </p>
      </div>
      {data && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  {["Last page", "Source / medium", "Device", "Sessions"].map(
                    (h) => (
                      <th key={h} className="p-3 border-b border-line">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.active.map((row, i) => (
                  <tr key={i}>
                    <td className="p-3 border-b border-line break-all">
                      {row.page}
                    </td>
                    <td className="p-3 border-b border-line">
                      {row.source} / {row.medium}
                    </td>
                    <td className="p-3 border-b border-line">{row.device}</td>
                    <td className="p-3 border-b border-line">{row.sessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.active.length && (
            <p className="text-sm text-muted">
              No tracked activity in the last 5 minutes.
            </p>
          )}
          <h3 className="font-semibold">Recent activity · last 30 minutes</h3>
          <p className="text-xs text-muted">
            Latest 40 actions. Purchase entries require a confirmed live payment
            and an eligible tracked checkout; confirmation can arrive after the
            customer leaves.
          </p>
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  {["Time", "Action", "Page / product", "Source", "Device"].map(
                    (h) => (
                      <th key={h} className="p-3 border-b border-line">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.events.map((row) => (
                  <tr key={`${row.name}-${row.id}`}>
                    <td className="p-3 border-b border-line whitespace-nowrap">
                      {new Date(row.time).toLocaleTimeString()}
                    </td>
                    <td className="p-3 border-b border-line">
                      {labels[row.name] || row.name}
                    </td>
                    <td className="p-3 border-b border-line break-all">
                      {row.page}
                      {row.item && (
                        <span className="block text-muted">{row.item}</span>
                      )}
                    </td>
                    <td className="p-3 border-b border-line">{row.source}</td>
                    <td className="p-3 border-b border-line">{row.device}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.events.length && (
            <p className="text-sm text-muted">
              No tracked actions in the last 30 minutes.
            </p>
          )}
        </>
      )}
    </section>
  );
}
