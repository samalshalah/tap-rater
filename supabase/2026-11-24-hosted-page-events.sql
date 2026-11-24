-- Anonymous Multi-Link page activity: page opens and link clicks.
-- No IP addresses, cookies or personal data are stored.
create table if not exists hosted_page_events (
  id bigserial primary key,
  code text not null,
  event_type text not null,
  source text not null default 'direct',
  button_id text,
  button_type text,
  device text not null default 'other',
  -- Permanent stand ID (customer_stand_registry.public_id) when the stand's link carries one.
  stand_id text,
  created_at timestamptz not null default now(),
  constraint hosted_page_events_stand_check check (stand_id is null or stand_id ~ '^ST-[A-Za-z0-9-]{4,80}$'),
  constraint hosted_page_events_code_check check (code ~ '^[A-HJKMNPQRSTVWXYZ2-9]{12}$'),
  constraint hosted_page_events_type_check check (event_type in ('view', 'click')),
  constraint hosted_page_events_source_check check (source in ('qr', 'nfc', 'direct')),
  constraint hosted_page_events_device_check check (device in ('ios', 'android', 'other')),
  constraint hosted_page_events_button_check check (
    (event_type = 'view' and button_id is null) or (event_type = 'click' and button_id is not null)
  )
);

create index if not exists hosted_page_events_code_created_idx
  on hosted_page_events(code, created_at desc);

alter table hosted_page_events enable row level security;
