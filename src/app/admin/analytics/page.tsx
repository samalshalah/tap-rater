import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminPlatformSummary, isAnalyticsConfigured, type TapsByDay } from "@/lib/analytics";
import type { ReactNode } from "react";

export default async function AdminAnalyticsPage() {
  await requireAdmin();
  const configured = isAnalyticsConfigured();
  const summary = await getAdminPlatformSummary();

  return (
    <AdminShell>
      <section className="tr-admin-section">
        <p className="tr-eyebrow">Growth</p>
        <div className="mt-3">
          <h1 className="tr-admin-title">Analytics</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Lightweight platform reporting from device taps, landing page clicks, and form submissions. Raw IP data is not shown here.
          </p>
        </div>

        {!configured ? (
          <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-ink">
            Database persistence is not configured yet. Analytics will appear after tap events and submissions can be read.
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <SummaryCard label="Total devices" value={summary.totalDevices} />
          <SummaryCard label="Active devices" value={summary.activeDevices} />
          <SummaryCard label="Unactivated" value={summary.unactivatedDevices} />
          <SummaryCard label="Taps 7 days" value={summary.tapsLast7Days} />
          <SummaryCard label="Taps 30 days" value={summary.tapsLast30Days} />
          <SummaryCard label="Submissions" value={summary.submissions} />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel title="Taps by day">
            <TapsByDayTable days={summary.tapsByDay} />
          </Panel>

          <Panel title="Top devices">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="text-xs uppercase text-muted">
                  <tr>
                    <th className="border-b border-line p-3">Device</th>
                    <th className="border-b border-line p-3">Status</th>
                    <th className="border-b border-line p-3">Taps</th>
                    <th className="border-b border-line p-3">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.topDevices.map((device) => (
                    <tr key={device.deviceId} className="border-b border-line last:border-b-0">
                      <td className="p-3 font-bold text-ink">{device.deviceCode}</td>
                      <td className="p-3 text-muted">{device.status ?? "-"}</td>
                      <td className="p-3 text-muted">{device.tapCount}</td>
                      <td className="p-3 text-muted">{device.destinationClicks}</td>
                    </tr>
                  ))}
                  {summary.topDevices.length === 0 ? <EmptyRow colSpan={4} label="No device events yet." /> : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="mt-6">
          <Panel title="Business performance">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="text-xs uppercase text-muted">
                  <tr>
                    <th className="border-b border-line p-3">Business ID</th>
                    <th className="border-b border-line p-3">Tap events</th>
                    <th className="border-b border-line p-3">Submissions</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.topBusinesses.map((business) => (
                    <tr key={business.businessId} className="border-b border-line last:border-b-0">
                      <td className="p-3 font-bold text-ink">{business.businessId}</td>
                      <td className="p-3 text-muted">{business.tapCount}</td>
                      <td className="p-3 text-muted">{business.submissions}</td>
                    </tr>
                  ))}
                  {summary.topBusinesses.length === 0 ? <EmptyRow colSpan={3} label="No business events yet." /> : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </section>
    </AdminShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-line bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase text-muted">{label}</p>
      <p className="mt-2 text-2xl font-black text-ink">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TapsByDayTable({ days }: { days: TapsByDay[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-xs uppercase text-muted">
        <tr>
          <th className="border-b border-line p-3">Date</th>
          <th className="border-b border-line p-3">Taps</th>
        </tr>
      </thead>
      <tbody>
        {days.map((day) => (
          <tr key={day.date} className="border-b border-line last:border-b-0">
            <td className="p-3 font-semibold text-ink">{day.date}</td>
            <td className="p-3 text-muted">{day.count}</td>
          </tr>
        ))}
        {days.length === 0 ? <EmptyRow colSpan={2} label="No tap events yet." /> : null}
      </tbody>
    </table>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-4 text-center text-muted">
        {label}
      </td>
    </tr>
  );
}
