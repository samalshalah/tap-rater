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

Store it as a secret in the Cloudflare Worker: `RESEND_API_KEY`.

Do not commit the key. Do not expose it as `NEXT_PUBLIC_*`.

## Environment Variables

Cloudflare Worker:

```text
RESEND_API_KEY
RESEND_FROM_EMAIL
ORDER_NOTIFICATION_EMAIL
ADMIN_NOTIFICATION_EMAIL
```

## Supported Email Types

The shared app helper in `src/lib/email.ts` supports:

- customer login magic link
- quote request notification
- quote request confirmation
- feedback alert
- link change request
- scheduled report placeholder

## Testing

Send test emails only to an address controlled by Tap Rater, using the app's own email flows
(e.g. the contact form, or a customer login link) once `RESEND_API_KEY` is configured.

## Safety

- Rotate any API key that was copied into chat, committed, or shown publicly.
- Use a verified sending domain before production mail.
- Keep `RESEND_API_KEY` server-side only.
- Avoid sending sensitive customer data in email bodies unless necessary.
