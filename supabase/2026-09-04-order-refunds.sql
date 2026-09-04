alter table orders
  add column if not exists stripe_refund_id text,
  add column if not exists refunded_at timestamptz;

create index if not exists orders_stripe_refund_id_idx
  on orders(stripe_refund_id)
  where stripe_refund_id is not null;
