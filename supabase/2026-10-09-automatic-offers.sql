-- Additive: preserve any existing administrator configuration.
INSERT INTO site_content(key,type,status,payload,updated_at)
VALUES ('automatic_offers','section','published',
'{"enabled":true,"excludedProducts":[],"second":{"enabled":true,"startsAt":null,"endsAt":null,"percent":15},"bundle3":{"enabled":true,"startsAt":null,"endsAt":null,"standardCents":10500,"brandedCents":13200},"bundle5":{"enabled":true,"startsAt":null,"endsAt":null,"standardCents":16600,"brandedCents":20800},"upgrade":{"enabled":true,"startsAt":null,"endsAt":null,"savingCents":300},"shipping":{"enabled":true,"thresholdCents":6000,"countryCodes":["US"]}}'::jsonb,now())
ON CONFLICT(key) DO NOTHING;
