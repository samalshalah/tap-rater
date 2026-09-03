alter table hosted_subscriptions
  drop constraint if exists hosted_subscriptions_stripe_subscription_id_key;

create index if not exists hosted_subscriptions_stripe_subscription_id_idx
  on hosted_subscriptions(stripe_subscription_id);

create table if not exists billing_invoice_items (
  id uuid primary key default gen_random_uuid(),
  billing_invoice_id uuid not null references billing_invoices(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  hosted_subscription_id uuid references hosted_subscriptions(id) on delete set null,
  line_item_index integer not null default 0,
  title text not null,
  option_label text,
  quantity integer not null default 1 check (quantity > 0),
  amount_cents integer not null default 0,
  recurring_amount_cents integer not null default 0,
  hosted_page_url text,
  metadata_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (billing_invoice_id, line_item_index)
);

create index if not exists billing_invoice_items_invoice_id_idx on billing_invoice_items(billing_invoice_id);
create index if not exists billing_invoice_items_hosted_subscription_id_idx on billing_invoice_items(hosted_subscription_id);
