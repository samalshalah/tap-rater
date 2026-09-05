# Resend Setup

Resend powers Tap Rater transactional email.

## Domain

Use one verified sending domain:

```text
taprater.com
```

or a dedicated mail subdomain:

```text
mail.taprater.com
```

Recommended sender:

```text
Tap Rater <notifications@taprater.com>
```

If using `mail.taprater.com`, use a sender address approved by that Resend domain.

## DNS

In Resend, add the sending domain and copy the DNS records it provides. Add those records in Cloudflare DNS for `taprater.com`.

Typical records include SPF/DKIM-related TXT or CNAME records, but use the exact values from the Resend dashboard. Do not invent or modify DNS targets.

After DNS is added, return to Resend and verify the domain.

## API Key

Create a production API key in Resend after the domain is verified.

Store it as a secret in:

- Cloudflare Worker: `RESEND_API_KEY`
- Railway backend: `RESEND_API_KEY`

Do not commit the key. Do not expose it as `NEXT_PUBLIC_*`.

## Environment Variables

Cloudflare Worker:

```text
RESEND_API_KEY
RESEND_FROM_EMAIL
RESEND_WEBHOOK_SECRET
ORDER_NOTIFICATION_EMAIL
ADMIN_NOTIFICATION_EMAIL
```

Railway backend:

```text
RESEND_API_KEY
RESEND_FROM_EMAIL
ORDER_NOTIFICATION_EMAIL
ADMIN_NOTIFICATION_EMAIL
```

## Delivery Webhook

Create a Resend webhook for:

```text
https://taprater.com/api/webhooks/resend
```

Subscribe it to:

```text
email.sent
email.delivered
email.delivery_delayed
email.failed
email.bounced
email.complained
email.suppressed
```

Store its signing secret in the Cloudflare Worker as `RESEND_WEBHOOK_SECRET`. The route verifies the untouched request body and Svix signature headers before changing delivery state.

The admin page at `/admin/settings/emails` distinguishes provider acceptance from confirmed delivery. It stores delivery metadata only. Email HTML, passwords, activation tokens, and payment data are not stored in the ledger.

Failed order-confirmation and shipping messages can be regenerated from the current order record and retried by an authenticated administrator. Secure activation and login-link messages are deliberately not replayed from the delivery log; use their token-rotation workflows instead.

## Supported Email Types

The shared app helper in `src/lib/email.ts` supports:

- customer login magic link
- quote request notification
- quote request confirmation
- feedback alert
- link change request
- scheduled report placeholder

The backend package also has a minimal Resend helper for operational jobs and a safe test command.

## Testing

Run:

```bash
npm run backend:email-test
```

The command sends only when `RESEND_API_KEY` and either `EMAIL_TEST_TO` or `ADMIN_NOTIFICATION_EMAIL` are configured. Otherwise it exits with a skip message.

Send test emails only to an address controlled by Tap Rater.

## Safety

- Rotate any API key that was copied into chat, committed, or shown publicly.
- Use a verified sending domain before production mail.
- Keep `RESEND_API_KEY` server-side only.
- Avoid sending sensitive customer data in email bodies unless necessary.
- Do not treat provider acceptance as proof that a message reached the recipient inbox.
