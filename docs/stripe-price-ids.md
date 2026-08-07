# Stripe Price ID documentation

The launch spec asks for this specifically: "Prepare the system so Stripe
price IDs can be added at the final step. Do not add live keys. Do not
enable live Stripe." This documents exactly that -- what each price ID is
for, how to create it, and what's already wired up to use it.

## Current status

**Checkout works correctly right now with zero Price IDs set.** Every
price is computed dynamically from the product's own `basePriceCents` /
`salePriceCents` (see `src/lib/checkout.ts`, `buildStripeCheckoutLineItems`)
using Stripe's `price_data` -- this is a fully valid way to run Stripe
Checkout, in both test and live mode.

Setting a Price ID is optional, additive prep for the final launch step,
not a requirement to keep testing today.

## The 4 price IDs

| Env var | Product | Amount | Type |
|---|---|---|---|
| `STRIPE_PRICE_STANDARD_DIRECT_3900` | Standard Direct Stand tier | $39.00 one-time | One-time price |
| `STRIPE_PRICE_BRANDED_QR_DIRECT_4900` | Branded + QR Direct Stand tier | $49.00 one-time | One-time price |
| `STRIPE_PRICE_HOSTED_MULTI_LINK_SETUP` | Hosted Multi-Link Stand -- setup fee | $49.00 one-time | One-time price |
| `STRIPE_PRICE_HOSTED_MULTI_LINK_SUBSCRIPTION` | Hosted Multi-Link Stand -- hosting | $9.90 / month | Recurring price |

(`STRIPE_PRICE_CUSTOM_DIRECT_4900` also exists in `.env.example` from an
earlier pass -- Custom Stand pricing is confirmed at $49 today, same
optional-prep pattern applies, though it wasn't in the spec's explicit
4-item list since Custom pricing may end up being case-by-case.)

## How to create these in Stripe (when you're ready)

All of this happens in **test mode** for now -- do not do this under a live
Stripe key until Stripe itself goes live.

1. Stripe Dashboard → Product catalog → **+ Add product**
2. Create one product per row above (e.g. "Tap Rater -- Standard Direct
   Stand")
3. For the one-time rows: add a price of the listed amount, billing period
   "One time"
4. For the subscription row (Hosted Multi-Link hosting): add a price of
   $9.90, billing period "Monthly"
5. Copy each price's ID (starts with `price_`) into the matching env var in
   your `.env` (or Cloudflare Worker secret, for the deployed environment)

## What's already wired up (and what isn't yet)

**Wired up now** (`src/lib/checkout.ts`, `buildStripeCheckoutLineItems`):
the three one-time tiers (Standard Direct, Branded + QR Direct, Hosted
Multi-Link **setup** fee) already check for their Price ID env var and use
it directly (`price: <id>`) when set, falling back to the current
`price_data` behavior when not. Setting these three env vars later requires
no code change.

**Not wired up yet, real remaining work**:
`STRIPE_PRICE_HOSTED_MULTI_LINK_SUBSCRIPTION` is documented here but not
yet read anywhere in checkout. Combining a one-time setup fee and a
recurring subscription in the same purchase needs a genuinely different
Stripe Checkout Session shape than what exists today:

- The current checkout flow always creates a session with `mode: "payment"`
  (a single one-time charge)
- A session that includes a recurring price needs `mode: "subscription"`,
  and Stripe's subscription-mode sessions have different rules for mixing
  one-time and recurring line items than payment-mode sessions do
- This is real design work (does the customer pay setup + first month
  together, or setup now / subscription starts on activation?), not a
  small addition -- flagging it clearly here rather than bolting on a
  half-correct implementation

Recommend treating "Hosted Multi-Link subscription checkout" as its own
scoped task at the actual final Stripe stage, informed by whatever billing
behavior is wanted at that point.

## Reminders (already true throughout this project, restated here)

- Never set any of these to a live-mode value (a Price ID created under a
  live Stripe key) until Stripe itself goes live
- `STRIPE_SECRET_KEY` must stay `sk_test_...` until the final approved step
- `isStripeTestSecretKey()` in `src/lib/checkout.ts` already rejects a live
  secret key outright, independent of anything in this document
