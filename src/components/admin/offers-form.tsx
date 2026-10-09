"use client";
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
    <label className="grid gap-2 text-sm">
      {label}
      <input
        required
        type="number"
        min={divisor === 100 ? "0.01" : "1"}
        step={divisor === 100 ? "0.01" : "1"}
        className="rounded border border-line p-3"
        value={amount / divisor}
        onChange={(e) =>
          set(key, field, Math.round(Number(e.target.value) * divisor))
        }
      />
    </label>
  );
  return (
    <form onSubmit={save} className="space-y-6">
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
      {(["second", "bundle3", "bundle5", "upgrade"] as const).map((key) => (
        <fieldset
          key={key}
          className="rounded-xl border border-line bg-white p-5 space-y-4"
        >
          <legend className="font-semibold px-2">
            {
              {
                second: "Second stand",
                bundle3: "3+ stand bundle",
                bundle5: "5+ stand bundle",
                upgrade: "Branded upgrade",
              }[key]
            }
          </legend>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={value[key].enabled}
              onChange={(e) => set(key, "enabled", e.target.checked)}
            />
            Enabled
          </label>
          {key === "second" ? (
            number(
              "Discount on one lower-priced stand (%)",
              key,
              "percent",
              value.second.percent,
            )
          ) : key === "upgrade" ? (
            number(
              "Savings per Branded stand ($)",
              key,
              "savingCents",
              value.upgrade.savingCents,
              100,
            )
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {number(
                "All-Standard bundle price ($)",
                key,
                "standardCents",
                value[key].standardCents,
                100,
              )}
              {number(
                "All-Branded bundle price ($)",
                key,
                "brandedCents",
                value[key].brandedCents,
                100,
              )}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {(["startsAt", "endsAt"] as const).map((field) => (
              <label key={field} className="grid gap-2 text-sm">
                {field === "startsAt"
                  ? "Starts (UTC, optional)"
                  : "Ends (UTC, optional)"}
                <input
                  type="datetime-local"
                  className="rounded border border-line p-3"
                  value={value[key][field]?.slice(0, 16) || ""}
                  onChange={(e) =>
                    set(
                      key,
                      field,
                      e.target.value
                        ? new Date(e.target.value + "Z").toISOString()
                        : null,
                    )
                  }
                />
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <p className="text-sm text-muted">
        Bundle prices are based on $39 Standard / $49 Branded stands. Mixed
        bundles combine per-design prices; differently priced variants receive
        the same proportional savings. The tier applies to every eligible stand
        once the quantity is reached.
      </p>
      <fieldset className="rounded-xl border border-line bg-white p-5 space-y-4">
        <legend className="font-semibold px-2">Free shipping</legend>
        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={value.shipping.enabled}
            onChange={(e) => set("shipping", "enabled", e.target.checked)}
          />
          Enable threshold-based free shipping
        </label>
        {number(
          "Merchandise threshold after discounts ($)",
          "shipping",
          "thresholdCents",
          value.shipping.thresholdCents,
          100,
        )}
        <label className="grid gap-2 text-sm">
          Eligible country codes (comma-separated)
          <input
            className="rounded border border-line p-3"
            value={value.shipping.countryCodes.join(", ")}
            onChange={(e) =>
              set(
                "shipping",
                "countryCodes",
                e.target.value
                  .toUpperCase()
                  .split(",")
                  .map((v) => v.trim()),
              )
            }
          />
        </label>
        <p className="text-sm text-muted">
          Tax and recurring fees do not count toward the threshold. This does
          not enable checkout in unsupported countries. An unconditional Free
          shipping mode in Shipping settings overrides this threshold.
        </p>
      </fieldset>
      <fieldset className="rounded-xl border border-line bg-white p-5">
        <legend className="font-semibold px-2">Eligible products</legend>
        <p className="text-sm text-muted mb-3">
          Checked products can receive merchandise discounts. New stand products
          are eligible by default.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
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
      <button disabled={busy} className="tr-button-primary">
        {busy ? "Saving…" : "Save offers"}
      </button>
      <p role="status">{status}</p>
    </form>
  );
}
