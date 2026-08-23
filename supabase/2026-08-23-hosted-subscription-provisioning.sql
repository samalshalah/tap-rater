create table if not exists stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists hosted_subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete restrict,
  business_id uuid not null references businesses(id) on delete restrict,
  hosted_page_id uuid not null references hosted_page_editor_pages(id) on delete restrict,
  order_id uuid references orders(id) on delete set null,
  stripe_checkout_session_id text not null unique,
  stripe_customer_id text,
  stripe_subscription_id text not null unique,
  permanent_code text not null unique references hosted_page_codes(code) on delete restrict,
  hosted_page_url text not null,
  status text not null default 'unknown',
  lifecycle_status text not null default 'ACTIVE',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  past_due_since timestamptz,
  grace_ends_at timestamptz,
  provisioning_status text not null default 'ready_for_customer_setup',
  provisioning_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hosted_subscriptions_permanent_code_check check (permanent_code ~ '^[A-HJKMNPQRSTVWXYZ2-9]{12}$'),
  constraint hosted_subscriptions_status_check check (
    status in ('active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'trialing', 'unknown')
  ),
  constraint hosted_subscriptions_lifecycle_status_check check (
    lifecycle_status in ('ACTIVE', 'PAST_DUE', 'CANCELLED_AT_PERIOD_END', 'EXPIRED', 'REACTIVATED', 'RETIRED_INTERNAL')
  ),
  constraint hosted_subscriptions_provisioning_status_check check (
    provisioning_status in ('ready_for_customer_setup', 'provisioning_failed')
  )
);

create index if not exists hosted_subscriptions_customer_id_idx
  on hosted_subscriptions(customer_id);

create index if not exists hosted_subscriptions_business_id_idx
  on hosted_subscriptions(business_id);

create index if not exists hosted_subscriptions_lifecycle_status_idx
  on hosted_subscriptions(lifecycle_status);
