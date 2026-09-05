create table if not exists stripe_processing_locks (
  resource_key text primary key,
  owner_token uuid not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  last_error text,
  updated_at timestamptz not null default now()
);

alter table stripe_processing_locks enable row level security;

alter table orders add column if not exists refund_status text;
alter table orders add column if not exists refunded_amount_cents integer not null default 0;
alter table orders add column if not exists refund_pending_amount_cents integer not null default 0;
alter table orders add column if not exists refund_failure_reason text;

create index if not exists orders_payment_intent_idx on orders(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;
