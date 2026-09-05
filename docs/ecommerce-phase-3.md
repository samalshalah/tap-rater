# Commerce Phase 3: Store Operating Controls

Verified September 5, 2026. Complete in Stripe test mode for the existing made-to-order operating model. Owner-observed acceptance remains Phase 5; real-money launch remains Phase 6.

## Release

- Worker: `tap-rater-app-git`, `https://taprater.com`.
- Final deployment: `f7c4fd2c-9b4a-40f5-a9e3-55fd9038a614`.
- Initial Phase 3 operating drill deployment: `9319b45e-6451-4283-a1ab-0679190e27e9`.
- Previous Phase 2 fallback: `5cf96db6-18ca-4bb8-85aa-483d9b8bab0e`.
- Stripe remains `test`; no live keys, subscription rates, tax rules, or public product prices were changed.

## Corrections

1. Standard and Branded prices now come from saved product options. Standard is no longer overwritten with 3900 cents when read for the storefront.
2. The admin product list reads those same database prices. The editor retains inactive options and their prices when reopened, instead of rebuilding them from active-only/default data.
3. Product requests no longer reuse the process-level 60-second catalog cache. New checkout sessions require a successful database catalog read; unavailable storage returns 503 instead of substituting static prices.
4. Empty or disabled database option sets do not restore default sellable options. Draft, archived, out-of-stock, and unavailable cart lines prevent checkout of the whole cart, rather than silently dropping items.
5. A stale cart requesting a disabled Multi-Link add-on is rejected instead of becoming a Direct order. Multi-Link remains the fixed $9.99/month service, explicitly labeled read-only in admin. Existing subscriptions are unchanged.
6. Advancing production/shipping requires complete line-item setup. Empty orders, missing Direct destinations, unresolved branded proofs/artwork, and unprovisioned hosted setups are blocked. Branded + Multi-Link also requires its physical artwork; its admin approval/regeneration path now includes that option.
7. Persisted shipment history prevents production changes and pre-shipment rollback even while shipping is blocked. Returning from blocked to shipped preserves `shipped_at` and does not trigger another first-shipment email. Notes remain editable where permitted.
8. Admin exposes production blockers and disables unavailable state choices, with server checks enforcing the same restrictions.

## Operating Policy

The existing inventory screen explicitly states that stands are produced to order. This phase preserves that model; it does not add finite stock counts, reservations, or automatic stock deduction. The owner was asked whether finite inventory was needed; no replacement policy was supplied during this work.

- `In stock` means accepting new orders; `Out of stock` pauses new checkout creation.
- Draft/archived products and disabled options are unavailable to new checkout creation.
- Customer quantity is purchase quantity, not warehouse stock.
- Availability/price changes do not cancel already-created Stripe sessions or rewrite existing order snapshots. Review any open checkout sessions separately when stopping sales urgently.
- Shipping remains manual: complete production, add actual carrier/tracking, mark shipped once, then delivered. A blocked shipment is an exception state, not permission to restart production.
- Support requests use new, in-progress, and resolved states with internal notes. The admin refund action refunds the whole Stripe charge; partial refunds and additional return handling remain manual procedures.

## Test Evidence

- Full suite: 747 tests passed across 115 files; nine integration tests skipped by default and then explicitly run successfully on the isolated database branch.
- Isolated branch: `br-tiny-truth-atyl121r`, project `winter-grass-30947546`. Admin save -> database -> admin list -> storefront -> Stripe line-item parameters was verified at $42/$55, then Standard changed to $46, including quantity two. Availability pause and inactive-option price retention passed. Only new isolated fixtures were edited and then archived.
- TypeScript, OpenNext production build, and Wrangler dry-run passed.
- Product editor inspected on desktop and 390-pixel mobile; fulfillment warning/control panel inspected at 1440 and 390 pixels. No document overflow in measured views. Browser screenshots were reviewed during the task.
- Public catalog remained 58 active, available products. No deployed product prices or availability flags were changed for testing.
- Ten deployed route smoke checks passed, including authenticated products, order detail, inventory, requests, and email settings. Unauthenticated fulfillment returned 401.
- Final deployed checkout rejected both a disabled Multi-Link request and a mixed cart containing an unavailable product with 400.

### Dedicated Paid Operations Drill

All actions used a test card and a clearly labeled test order. No product was manufactured, no shipping label was purchased, and no package was sent.

- Order: `176806a8-8709-4ac9-acbb-eb2805585bce`.
- Name: `Phase 3 Operations QA - Do Not Fulfill`.
- Session: `cs_test_b1vLp3qQURrLngr3QBoJYMLD9sZpT0YysLNHq1hhz0mVJinHNOQy9J0rb4`.
- Amount: $53.34 ($39 stand, $12 shipping, $2.34 configured tax).
- Invoice: `in_1UCPPUJfXGmPO60VPtRYWYim`, paid, $53.34.
- Checkout and invoice recovery jobs completed on attempt 1 without an error.
- Production ready -> in progress -> completed -> ready to ship -> simulated shipped -> blocked -> shipped -> delivered passed through deployed admin APIs.
- Premature shipment, shipment rollback, post-shipment production changes, and delivered rollback each returned 409.
- One shipping message was accepted by the provider on attempt 1. Returning to shipped did not create another shipping message or replace the original shipment timestamp.
- Public support request `72d168ab-43b5-4dac-b965-046d14aaada0` persisted, moved in progress -> resolved, and stored `resolved_at` and internal notes.
- Full test refund: `re_3UCPPRJfXGmPO60V1Jp72QGv`, succeeded. Final order state: canceled/refunded. Post-refund production remained locked.
- The invoice remains a paid invoice reflecting the original payment; refund status is recorded separately on the order.

Evidence: `artifacts/ecommerce-phase-3/operations-*.json`. The first two records cover fulfillment/support/refund on the initial release; the final record covers final-release checkout guards and reconciliation. `verify-operations.mjs` is restricted to the exact dedicated test order. Do not rerun `--fulfill` or use it against customer orders.

## Owner Acceptance Still Open

1. Confirm made-to-order availability is the intended inventory model. Finite stock would require a separate reservation/deduction design before selling limited stock.
2. Observe the real artwork review, NFC/QR programming, packing, tracking, support, and refund procedure. The deployed drill simulated physical production and shipment; branded artwork failure guards are covered by tests, not a new physical print run.
3. Confirm actual inbox receipt for order and shipping messages. Provider acceptance is not delivery or inbox proof; signed Resend delivery setup remains open.
4. Complete account/portal, security/recovery, tax/legal, and real-money launch gates in Phases 4-6. This phase does not make the store live-payment ready.

## Reproduce

```powershell
npm test -- --reporter=dot
node artifacts/ecommerce-phase-2/run-isolated-tests.mjs
npx tsc --noEmit
npm run cf:build
npx wrangler deploy --dry-run
node artifacts/ecommerce-phase-3/verify-operations.mjs --checkout-guards
```

The isolated runner refuses the application database host. The deployed verification script authenticates from local environment credentials without printing them and writes metadata-only evidence. Its optional mutation flags are only for this already-refunded dedicated test case.
