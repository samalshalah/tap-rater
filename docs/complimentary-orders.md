# Complimentary orders

Open Admin > Orders > Create complimentary order. Choose an active, in-stock existing stand, Standard or Branded, and quantity. Enter the client details, business name, destination link and internal reason. Branded stands require a logo upload. Choose free US shipping or pickup / hand delivery. The client total is always zero.

Creation sends no email, creates no Stripe session, and does not provision a subscription or a new customer login. The client email and delivery details are stored on the order. Branded orders remain on hold for artwork approval; use Artwork operations on the order to approve and generate the print file, then inspect the file before production. Existing fulfillment and shipping tools remain available.

The Orders screen has a Complimentary filter. Complimentary orders cannot be refunded and are excluded from the Paid filter and paid-sales analytics. To remain compatible with the existing database status constraint, their operational status is `paid` (settled) with `payment_status=complimentary`, a `comp_` reference, and zero totals. Revenue code must require an actual paid payment status; do not infer payment from operational status alone.

The admin-only creation endpoint checks the request origin, validates the current catalog, verifies the uploaded logo exists, and uses a unique request ID to prevent duplicate orders on retries. No database migration is required.
