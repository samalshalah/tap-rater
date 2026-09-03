create table if not exists billing_invoices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  hosted_subscription_id uuid references hosted_subscriptions(id) on delete set null,
  email text not null,
  stripe_customer_id text,
  stripe_invoice_id text unique,
  stripe_checkout_session_id text,
  stripe_subscription_id text,
  stripe_payment_intent_id text,
  invoice_number text,
  status text,
  payment_status text,
  payment_method_label text,
  hosted_invoice_url text,
  invoice_pdf_url text,
  receipt_url text,
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  amount_paid_cents integer not null default 0 check (amount_paid_cents >= 0),
  currency text not null default 'usd',
  issued_at timestamptz,
  paid_at timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_invoices_customer_id_idx on billing_invoices(customer_id);
create index if not exists billing_invoices_email_created_at_idx on billing_invoices(email, created_at desc);
create index if not exists billing_invoices_order_id_idx on billing_invoices(order_id);
create index if not exists billing_invoices_subscription_id_idx on billing_invoices(stripe_subscription_id);
