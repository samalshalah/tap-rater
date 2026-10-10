"use client";
import { useEffect, useState } from "react";
import { defaultReminderSettings, type ReminderSettings } from "@/lib/checkout-reminder-model";
export function CheckoutReminderSettings() {
  const [settings, setSettings] = useState<ReminderSettings>(defaultReminderSettings), [status, setStatus] = useState("Loading…"), [ready, setReady] = useState(false);
  useEffect(() => { fetch("/api/admin/checkout-reminders").then(async r => { if (!r.ok) throw new Error(); setSettings(await r.json()); setReady(true); setStatus(""); }).catch(() => setStatus("Settings could not be loaded.")); }, []);
  async function save() {
    setStatus("Saving…");
    try { const r = await fetch("/api/admin/checkout-reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) }); const result = await r.json(); setStatus(r.ok ? "Reminder settings saved." : result.error); } catch { setStatus("Settings could not be saved."); }
  }
  return <section className="tr-admin-card mt-8 space-y-4 p-6">
    <h2 className="text-xl font-semibold">Unfinished checkout reminders</h2>
    <p className="text-sm text-muted">Only new live checkouts with reminder permission are enrolled. Paid, processing, internal/test, unsubscribed, and bounced customers are excluded. Reminders use the order confirmation design. No additional discounts are applied.</p>
    <label className="flex gap-3"><input type="checkbox" checked={settings.enabled} onChange={e => setSettings({ ...settings, enabled: e.target.checked })} />Enable automatic reminders</label>
    <div className="grid gap-4 sm:grid-cols-3">{([['firstHours', 'First reminder'], ['secondHours', 'Second reminder'], ['thirdHours', 'Optional final reminder']] as const).map(([key, label]) => <label key={key} className="text-sm">{label} (hours)<input className="tr-input mt-2 w-full" type="number" min="1" max="168" value={settings[key]} onChange={e => setSettings({ ...settings, [key]: Number(e.target.value) })} /></label>)}</div>
    <label className="flex gap-3"><input type="checkbox" checked={settings.thirdEnabled} onChange={e => setSettings({ ...settings, thirdEnabled: e.target.checked })} />Send the optional final reminder</label>
    <p className="text-xs text-muted">Checked every 15 minutes, with at least 12 hours between messages. Old orders are not automatically enrolled. Personal invitations and pause controls are available on each order.</p>
    <button className="tr-button-primary" disabled={!ready || status === "Saving…"} onClick={save}>Save reminder settings</button><p role="status" className="text-sm">{status}</p>
  </section>;
}
