"use client";
import { AdminDataTable, AdminButton } from "./admin-ui";
import { useState } from "react";
import type { OffersSettings } from "@/lib/offers";
export function OffersForm({
  initial,
  products,
}: {
  initial: OffersSettings;
  products: { slug: string; title: string }[];
}) {
  const [value, setValue] = useState(initial),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const set = (
    key: "second" | "bundle3" | "bundle5" | "upgrade" | "shipping",
    field: string,
    next: unknown,
  ) => setValue((v) => ({ ...v, [key]: { ...v[key], [field]: next } }));
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setStatus("Offers saved. New checkout sessions will use these settings.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not save offers.",
      );
    } finally {
      setBusy(false);
    }
  }
  const number = (
    label: string,
    key: "second" | "bundle3" | "bundle5" | "upgrade" | "shipping",
    field: string,
    amount: number,
    divisor = 1,
  ) => (
    <label className="grid min-w-0 gap-1 text-xs">
      {label}
      <input
        required
        type="number"
        min={divisor === 100 ? "0.01" : "1"}
        step={divisor === 100 ? "0.01" : "1"}
        className="min-h-10 min-w-0 w-full rounded border border-line px-3 py-2"
        value={amount / divisor}
        onChange={(e) =>
          set(key, field, Math.round(Number(e.target.value) * divisor))
        }
      />
    </label>
  );
  return (
    <form onSubmit={save} className="space-y-4">
      <label className="flex gap-3 font-semibold">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => setValue({ ...value, enabled: e.target.checked })}
        />
        Enable automatic merchandise offers
      </label>
      <p className="text-sm text-muted">
        The best eligible discount wins; discounts never stack. Applies across
        eligible Standard and Branded stands. Subscription/hosted products and
        custom quotes are excluded. Free shipping is controlled separately.
      </p>
      <AdminDataTable caption="Automatic offers" headers={["Offer", "Discount / price", "Status", "Schedule / eligibility"]} minWidth="800px">
        {(["second", "bundle3", "bundle5", "upgrade"] as const).map((key) => {
          const title = { second: "Second stand", bundle3: "3+ stand bundle", bundle5: "5+ stand bundle", upgrade: "Branded upgrade" }[key];
          return (
            <tr key={key}>
                <th scope="row" className="text-left font-semibold">{title}</th>
                <td>
                <div className="grid max-w-[360px] grid-cols-2 gap-3">
                  {key === "second" ? number("Lower-priced stand discount (%)", key, "percent", value.second.percent)
                    : key === "upgrade" ? number("Savings per Branded stand ($)", key, "savingCents", value.upgrade.savingCents, 100)
                    : <>
                      {number("Standard bundle ($)", key, "standardCents", value[key].standardCents, 100)}
                      {number("Branded bundle ($)", key, "brandedCents", value[key].brandedCents, 100)}
                    </>}
                </div>
                </td>
                <td><label className="flex items-center gap-2 text-xs"><input type="checkbox" aria-label={`Enable ${title}`} checked={value[key].enabled} onChange={(e) => set(key, "enabled", e.target.checked)} />{value[key].enabled ? "Enabled" : "Disabled"}</label></td>
                <td><details className="min-w-0 text-xs" open={Boolean(initial[key].startsAt || initial[key].endsAt)}>
                  <summary className="min-h-10 cursor-pointer content-center text-brand">
                    Schedule · {value[key].startsAt || value[key].endsAt ? "Dates set" : "No date limits"}
                  </summary>
                  <div className="mt-2 grid max-w-lg gap-2 sm:grid-cols-2">
                    {(["startsAt", "endsAt"] as const).map((field) => (
                      <label key={field} className="grid min-w-0 gap-1">
                        {field === "startsAt" ? "Starts (UTC, optional)" : "Ends (UTC, optional)"}
                        <input type="datetime-local" className="min-h-10 min-w-0 w-full rounded border border-line px-2 py-2"
                          value={value[key][field]?.slice(0, 16) || ""}
                          onChange={(e) => set(key, field, e.target.value ? new Date(e.target.value + "Z").toISOString() : null)} />
                      </label>
                    ))}
                  </div>
                </details></td>
            </tr>
          );
        })}
        <tr>
          <th scope="row" className="text-left font-semibold">Free shipping</th>
          <td>
            <div className="grid max-w-[360px] grid-cols-2 gap-3">
              {number("Threshold after discounts ($)", "shipping", "thresholdCents", value.shipping.thresholdCents, 100)}
              <label className="grid min-w-0 gap-1 text-xs">
                Country codes
                <input className="min-h-10 min-w-0 w-full rounded border border-line px-3 py-2"
                  value={value.shipping.countryCodes.join(", ")}
                  onChange={(e) => set("shipping", "countryCodes", e.target.value.toUpperCase().split(",").map((v) => v.trim()))} />
              </label>
            </div>
            </td>
            <td><label className="flex items-center gap-2 text-xs"><input type="checkbox" aria-label="Enable free shipping" checked={value.shipping.enabled} onChange={(e) => set("shipping", "enabled", e.target.checked)} />{value.shipping.enabled ? "Enabled" : "Disabled"}</label></td>
            <td><p className="max-w-sm text-xs text-muted">Based on merchandise after discounts. Tax and recurring fees excluded.</p></td>
        </tr>
      </AdminDataTable>
      <details className="text-xs text-muted">
        <summary className="min-h-10 cursor-pointer content-center">How bundle pricing and shipping eligibility work</summary>
        <p className="mt-2 max-w-3xl leading-5">Bundle prices are based on $39 Standard / $49 Branded stands. Mixed bundles combine per-design prices; differently priced variants receive the same proportional savings. The tier applies to every eligible stand once the quantity is reached. Shipping eligibility does not enable checkout in unsupported countries. An unconditional Free shipping mode in Shipping settings overrides this threshold.</p>
      </details>
      <details className="rounded-xl border border-line bg-white p-3">
        <summary className="cursor-pointer text-sm font-semibold">Eligible products ({products.filter((product) => !value.excludedProducts.includes(product.slug)).length} of {products.length})</summary>
        <fieldset className="mt-3 min-w-0">
        <legend className="sr-only">Eligible products</legend>
        <p className="text-sm text-muted mb-3">
          Checked products can receive merchandise discounts. New stand products
          are eligible by default.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <label className="flex gap-2" key={p.slug}>
              <input
                type="checkbox"
                checked={!value.excludedProducts.includes(p.slug)}
                onChange={(e) =>
                  setValue((v) => ({
                    ...v,
                    excludedProducts: e.target.checked
                      ? v.excludedProducts.filter((id) => id !== p.slug)
                      : [...v.excludedProducts, p.slug],
                  }))
                }
              />
              {p.title}
            </label>
          ))}
        </div>
        </fieldset>
      </details>
      <AdminButton disabled={busy} variant="primary" type="submit">
        {busy ? "Saving..." : "Save offers"}
      </AdminButton>
      {status ? <p role="status">{status}</p> : null}
    </form>
  );
}
