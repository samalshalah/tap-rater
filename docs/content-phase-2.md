# Content Correction Phase 2

## Approved current product facts

Owner confirmed September 9, 2026:

- Material: acrylic.
- NFC chip: NTAG213.
- Stand size: 165 x 108 mm (approximately 6.50 x 4.25 inches).
- Base: 50 mm (approximately 1.97 inches).
- Package contents: the stand only, one stand per purchased unit.

These facts apply to the current standard-format catalog, not all future products.
Do not infer chip memory, thickness, color, warranty, certifications, packaging
extras, or printer bleed from these specifications.

## Unconfirmed and future items

Standard preparation, Branded preparation, and shipping transit estimates remain
unconfirmed. No numerical estimates or guaranteed dispatch/delivery dates are
published. Admin shipping notes remain editable for later approved estimates.

Future product, not ready or offered for sale: acrylic A4 stand, NTAG213 144-byte
chip, 210 x 297 mm, 80 mm base. Keep this as a planning note only; do not create an
active SKU, size option, product specification override, or stock entry for it.

Printer acceptance of artwork size, bleed, and color remains a separate check.

## Changes

- Custom Stands shopping leads to a Branded + QR availability filter, retaining
  search, sorting, type/use filters, and pagination. It excludes products without
  an active sellable Branded option/template and displays Branded option prices.
- Custom Stands uses the literal Branded + QR category name; homepage discovery
  continues linking to the Custom Stands page.
- Solution pages omit a duplicated leading teaser without rewriting distinct
  merchant paragraphs or changing saved CMS records.
- Product benefit copy follows each product's destination rather than describing
  every product as a review request. The previously repaired unfinished branding
  sentence and Standard NFC-only / Branded QR rules remain unchanged.
- Admin product specifications and package contents have editable, validated
  rows using the existing API/schema and separate Branded-only item scope.
- Shipping costs and preparation are labeled separately; empty preparation
  estimates are omitted rather than replaced with invented lead times.

Product fact publication is a separate bounded catalog-data update. Prices,
inventory, product identities, artwork templates, orders, tax, payment settings,
and subscription data must remain unchanged. Stripe remains in TEST mode.

## Verification

- Published approved facts to the 58 explicitly identified current stands using
  one atomic compare-and-set update. Empty legacy objects were normalized to
  arrays. No existing populated specifications or package contents were replaced.
- Verified all other product columns and shipping settings were unchanged.
  Local before-data and receipt: `artifacts/content-phase-2-20260909/`.
- Unit suite: 1,137 passed; nine opt-in database tests skipped. TypeScript: zero
  diagnostics. OpenNext Cloudflare production build passed.
- Browser checked Custom Stands navigation, filtered catalog prices and search,
  plus the physical-details editor at desktop and 320/390-pixel mobile widths.
- Added, edited, and removed temporary specification/package rows. Captured the
  form's save request to verify trimmed payload fields, then returned a controlled
  QA error without forwarding it to the database. No test product data was saved.
