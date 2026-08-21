begin;

alter table orders
  add column if not exists shipping_address_json jsonb,
  add column if not exists shipping_amount_cents integer not null default 0,
  add column if not exists shipping_mode text,
  add column if not exists production_status text not null default 'not_started',
  add column if not exists shipping_status text not null default 'not_shipped',
  add column if not exists shipping_method text,
  add column if not exists shipping_carrier text,
  add column if not exists tracking_number text,
  add column if not exists tracking_url text,
  add column if not exists shipped_at timestamptz,
  add column if not exists internal_notes text not null default '',
  add column if not exists admin_fulfillment_notes text not null default '';

create index if not exists orders_fulfillment_queue_idx
  on orders(status, production_status, shipping_status, created_at desc);

insert into site_content (key, type, status, payload, created_at, updated_at)
values (
  'shipping_settings',
  -- site_content.type is constrained to existing CMS types; operational settings use section.
  'section',
  'published',
  '{
    "shippingMode": "manual",
    "flatShippingAmountCents": 0,
    "allowedCountryCodes": ["US"],
    "handlingTimeText": "",
    "supportedRegionsText": "United States",
    "defaultCarrierNotes": "",
    "customerFacingShippingNote": "Production and shipping timelines are shown at checkout or shared after order review when applicable."
  }'::jsonb,
  now(),
  now()
)
on conflict (key) do nothing;

commit;
