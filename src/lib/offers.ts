import { z } from "zod";

const schedule = {
  enabled: z.boolean(),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
};
const price = z.number().int().min(1).max(1000000);
export const offersSchema = z
  .object({
    enabled: z.boolean(),
    excludedProducts: z.array(z.string().regex(/^[a-z0-9-]{1,120}$/)).max(200),
    second: z.object({ ...schedule, percent: z.number().int().min(1).max(80) }),
    bundle3: z.object({
      ...schedule,
      standardCents: price.max(11700),
      brandedCents: price.max(14700),
    }),
    bundle5: z.object({
      ...schedule,
      standardCents: price.max(19500),
      brandedCents: price.max(24500),
    }),
    upgrade: z.object({
      ...schedule,
      savingCents: z.number().int().min(1).max(1000),
    }),
    shipping: z.object({
      enabled: z.boolean(),
      thresholdCents: price,
      countryCodes: z
        .array(z.string().regex(/^[A-Z]{2}$/))
        .min(1)
        .max(50),
    }),
  })
  .superRefine((value, ctx) => {
    for (const key of ["second", "bundle3", "bundle5", "upgrade"] as const) {
      const row = value[key];
      if (row.startsAt && row.endsAt && row.startsAt >= row.endsAt)
        ctx.addIssue({
          code: "custom",
          path: [key, "endsAt"],
          message: "End must be after start.",
        });
    }
  });
export type OffersSettings = z.infer<typeof offersSchema>;
const active = { enabled: true, startsAt: null, endsAt: null };
export const defaultOffers: OffersSettings = {
  enabled: true,
  excludedProducts: [],
  second: { ...active, percent: 15 },
  bundle3: { ...active, standardCents: 10500, brandedCents: 13200 },
  bundle5: { ...active, standardCents: 16600, brandedCents: 20800 },
  upgrade: { ...active, savingCents: 300 },
  shipping: { enabled: true, thresholdCents: 6000, countryCodes: ["US"] },
};
export type OfferLine = {
  productId: string;
  optionId: string;
  quantity: number;
  unitAmountCents: number;
  recurring?: boolean;
};
export type OfferQuote = {
  label: string | null;
  offerId: string | null;
  originalCents: number;
  discountCents: number;
  subtotalCents: number;
  lineDiscounts: number[];
};
export function offerIsActive(
  rule: { enabled: boolean; startsAt: string | null; endsAt: string | null },
  now: number,
) {
  return (
    rule.enabled &&
    (!rule.startsAt || Date.parse(rule.startsAt) <= now) &&
    (!rule.endsAt || Date.parse(rule.endsAt) > now)
  );
}
export function quoteOffers(
  lines: OfferLine[],
  settings: OffersSettings,
  now = Date.now(),
): OfferQuote {
  const originalCents = lines.reduce(
    (sum, r) => sum + r.unitAmountCents * r.quantity,
    0,
  );
  const eligible = lines.map(
    (r) =>
      !r.recurring &&
      ["standard_direct", "branded_qr_direct"].includes(r.optionId) &&
      !settings.excludedProducts.includes(r.productId),
  );
  const quantity = lines.reduce(
    (sum, r, i) => sum + (eligible[i] ? r.quantity : 0),
    0,
  );
  let best: OfferQuote = {
    originalCents,
    discountCents: 0,
    subtotalCents: originalCents,
    lineDiscounts: lines.map(() => 0),
    offerId: null,
    label: null,
  };
  if (!settings.enabled) return best;
  const candidate = (id: string, label: string, amounts: number[]) => {
    const lineDiscounts = amounts.map((n, i) =>
      Math.min(
        lines[i].unitAmountCents * lines[i].quantity,
        Math.max(0, Math.round(n)),
      ),
    );
    const discountCents = lineDiscounts.reduce((a, b) => a + b, 0);
    if (discountCents > best.discountCents)
      best = {
        originalCents,
        discountCents,
        subtotalCents: originalCents - discountCents,
        offerId: id,
        label,
        lineDiscounts,
      };
  };
  if (quantity >= 2 && offerIsActive(settings.second, now)) {
    // One lower-priced stand per order, not one discount per pair.
    const index = lines.reduce(
      (best, row, i) =>
        eligible[i] &&
        (best < 0 || row.unitAmountCents < lines[best].unitAmountCents)
          ? i
          : best,
      -1,
    );
    candidate(
      "second",
      `${settings.second.percent}% off a second stand`,
      lines.map((r, i) =>
        i === index ? (r.unitAmountCents * settings.second.percent) / 100 : 0,
      ),
    );
  }
  for (const size of [3, 5] as const) {
    const rule = size === 3 ? settings.bundle3 : settings.bundle5;
    if (quantity < size || !offerIsActive(rule, now)) continue;
    // Mixed designs combine their tier rates. Higher quantities keep the tier rate.
    candidate(
      `bundle${size}`,
      `${size}+ stand bundle`,
      lines.map((r, i) => {
        if (!eligible[i]) return 0;
        const base = r.optionId === "standard_direct" ? 3900 : 4900;
        const target =
          r.optionId === "standard_direct"
            ? rule.standardCents
            : rule.brandedCents;
        return (
          r.unitAmountCents *
          r.quantity *
          Math.max(0, 1 - target / (base * size))
        );
      }),
    );
  }
  if (offerIsActive(settings.upgrade, now))
    candidate(
      "upgrade",
      "Branded upgrade savings",
      lines.map((r, i) =>
        eligible[i] && r.optionId === "branded_qr_direct"
          ? Math.min(settings.upgrade.savingCents, r.unitAmountCents) *
            r.quantity
          : 0,
      ),
    );
  return best;
}
export function offerShippingSettings<
  T extends { shippingMode: "manual" | "free" | "flat" },
>(settings: T, offers: OffersSettings, country = "US") {
  return {
    ...settings,
    freeShippingThresholdCents:
      offers.shipping.enabled && offers.shipping.countryCodes.includes(country)
        ? offers.shipping.thresholdCents
        : null,
  };
}
