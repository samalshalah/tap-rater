# Order design downloads

Admin > Orders > order > Line items now includes Client design files:

- Download design (SVG): the final, embedded print artwork generated after paid
  checkout. Existing payment, refund, order-line ownership, and approval gates
  remain in force. This does not regenerate or alter the customer's approval.
- Download original logo: the customer's source upload, with the prepared upload
  as a fallback for older orders that have no separate original reference.
- Download print logo: shown when the prepared logo differs from the original.
- Download design text: UTF-8 text containing business name, visibility, sizing,
  logo position, destination links, quantity, and customer design notes.
- Copy business name: copies the exact stored business text.

Downloads fetch authenticated bytes, check the response type, and trigger a named
browser download. A missing file or expired login shows an error within the order
instead of navigating to an API response in a new tab. Preview links remain
separate. Logo and text endpoints require admin authentication and use private,
no-store responses. Input files can be inspected before payment, but the separate
final-artwork endpoint still requires paid, approved, unreversed orders.

Only logo keys attached to the requested order line within that product's customer
upload folder are served. Arbitrary URLs, storage paths, and production-artwork
keys are not accepted by the logo endpoint.

## Verification

- The reported paid order already had a generated SVG; its authenticated live
  endpoint returned HTTP 200 with SVG bytes before these changes. No payment,
  approval, or artwork regeneration was needed.
- 32 new tests cover source-file ownership, original/prepared selection, text
  export, malformed input, authentication, errors, and browser save behavior.
- Full suite: 1,077 passed, nine pre-existing opt-in database tests skipped.
- TypeScript: zero diagnostics, excluding unrelated local artifact exports.
- Chrome: a real order text file saved to Downloads. A controlled SVG response
  saved successfully through the same UI. The temporary SVG fixture was removed.
- Local missing artwork displays an inline error without leaving the order.
- Mobile simulation: 390px page and document width, 44px download targets,
  no horizontal overflow. Network interception and viewport overrides removed.

The final design remains SVG at the stored print dimensions, with embedded artwork
and outlined business text. The original source logo is not resized or converted
by the download endpoint. These controls do not send email attachments.
