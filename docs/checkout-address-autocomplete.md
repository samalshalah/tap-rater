# Checkout address autocomplete

The shipping Address field suggests U.S. addresses after three characters and a
350 ms pause. Selecting a suggestion fills street, city, state, and ZIP (including
ZIP+4). An existing apartment/suite is retained unless the selected address
includes a unit. Customers must review the editable shipping fields before paying.
Autocomplete is not address validation or a delivery guarantee.

## Configuration

- Uses the existing server-only `GOOGLE_PLACES_API_KEY` secret. The existing Maps
  key aliases are also accepted; no key is sent to the browser.
- Requires Places API (New) and the project's existing Google billing/quota setup.
  Google usage charges apply under that account's configuration.
- The browser creates one UUID session token per search/selection session.
- Only suggestion IDs/text and selected address components are requested.
- Requests use a private, no-store POST endpoint, bounded request sizes, a five
  second provider timeout, same-origin checks, and the existing 120/minute public
  event limiter with a separate `checkout-address` key. Payment quota is unaffected.
- No addresses or provider error bodies are logged. Suggestions are not stored.
- Missing configuration, timeouts, empty results, unsupported addresses, and quota
  errors leave manual checkout available.

## Verification

- 29 new unit tests cover mapping, ZIP leading zeros/ZIP+4, missing fields, US
  restriction, limits, provider failures, credentials, request validation, and
  browser request/session behavior.
- Full suite: 1,045 passed; nine pre-existing opt-in database tests skipped.
- TypeScript: no diagnostics (local artifact exports excluded from the check).
- Chrome local UI with controlled lookup responses: keyboard and pointer selection,
  all shipping fields updated, suite retained, new session after selection,
  cancellation of stale requests, Escape dismissal, and 390px mobile layout.
- Local provider-unavailable fallback checked without modifying Google credentials.
- Test interception and device emulation removed after the UI check.

## Owner test

1. Open checkout with an item in your cart.
2. Type the first part of your shipping street address.
3. Choose your address from the dropdown, or use arrow keys and Enter.
4. Review the street, apartment/suite, city, state, and ZIP before continuing.

No real payment is needed to test this feature. Stripe remains in test mode.
