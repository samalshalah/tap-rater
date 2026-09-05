# Tap Rater Admin Operations Runbook

Use this runbook for test-mode launch validation and daily commerce operations. Do not use a real customer order for drills.

## Order Guardrails

- Production and shipping state require a confirmed paid order.
- An unpaid, failed, canceled, or refunded order permits internal-note updates only.
- Shipping requires `completed` production.
- Mark `shipped` before `delivered`.
- Shipped orders cannot return to a pre-shipment state; delivered orders cannot move backward.
- Artwork approval, regeneration, and customer-change actions stop after shipment.

## Fulfillment Sequence

1. Confirm Payment and Payment status both show paid.
2. Review every line item, destination, proof, logo, SKU, and production warning.
3. Advance production through Ready for production, In production, and Completed.
4. Set shipping to Ready to ship.
5. Enter the carrier, method, tracking number, and an `https://` tracking URL.
6. Set shipping to Shipped. This records the first shipped timestamp and attempts the shipping email once.
7. Confirm the email attempt in `/admin/settings/emails` and resolve any failed delivery.
8. Set shipping to Delivered only after delivery is confirmed.

Email delivery failure does not roll back a shipped order. Resolve the delivery failure from the email operations log without changing the order backward.

## Full Refund

1. Confirm the order is paid and has a Stripe payment reference.
2. For Multi-Link, decide separately whether the recurring subscription should continue or be canceled in Stripe.
3. Select the full-refund confirmation and submit once.
4. Reconcile the refund ID in Tap Rater Admin with Stripe.
5. If Stripe succeeded but Tap Rater reports a local save failure, do not submit again. Reconcile the existing Stripe refund and repair the order record.

Partial refunds remain a Stripe Dashboard operation. The Tap Rater action refunds the complete charge.

## Inventory Availability

1. Open `/admin/inventory`.
2. Mark a product Out of stock to stop new checkout validation for that product.
3. Confirm the availability badge changes.
4. Mark it In stock only when it can be sold again.

Do not use inventory toggles to cancel or alter orders that already exist.

## Customer Requests

1. Open `/admin/requests` and work from Open work.
2. Move a request to In progress when staff begins work.
3. Record only operational details in Internal notes; do not store card data, passwords, or secrets.
4. Move the request to Resolved after the customer-facing action is complete.
5. Reopen it as In progress if follow-up is required.

## Controlled Test-Mode Drill

Run with dedicated Stripe test orders, a designated QA product, a disposable QA request, and an owner-controlled mailbox.

1. Complete the full fulfillment sequence and verify the shipping email attempt.
2. Attempt one invalid transition before production completion and confirm it is rejected.
3. Toggle the QA product out of stock, verify checkout rejection, then restore it.
4. Exercise New, In progress, Resolved, and reopen on the QA request.
5. Refund a separate paid test order and reconcile the refund reference in Stripe test mode.
6. Record the date, operator, order IDs, request ID, product slug, and outcome without recording secrets or card data.
