# Custom-only stand sales

New purchases offer only custom stands with a business logo, business name, NFC and QR. Standard options are rejected by cart/checkout even if old database flags remain active. Old saved carts are not silently upgraded to a higher price.

Historical standard option definitions, artwork files, order snapshots, fulfillment, device links and return-policy coverage remain available. Do not delete these historical assets or rewrite existing orders.

Public catalog copy, CMS legacy claims, product images, pricing, buying guides, feeds, structured data and retired product links have been updated. CMS layout settings and custom merchant prose are preserved. The separate layout previews under `artifacts/homepage-options-v2` were not modified.

## Release

Deploy the application change, then apply `supabase/2026-10-28-retire-standard-sales.sql` to deactivate old standard sales options. The migration updates only option availability and does not delete orders or products. It has not been applied to the live database during this task.

## Verification

- Full Vitest suite: 2,363 tests passed.
- Targeted homepage, CMS and historical-order/custom-only regression checks passed after final image changes.
- Production Next.js build includes TypeScript verification.
- Local browser checks confirmed custom catalog cards, custom pricing, no standard selector, and destination/logo/preview setup steps.

Implementation branch: `codex/custom-only-stands-20261028`, based on `1eed475` from `origin/nextjs-commerce`.
