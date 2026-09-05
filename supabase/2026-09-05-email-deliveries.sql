create table if not exists email_deliveries (
  id uuid primary key default gen_random_uuid(),
  message_type text not null,
  audience text not null,
  recipient text not null,
  subject text not null,
  status text not null default 'sending',
  provider_message_id text,
  idempotency_key text not null,
  failure_reason text,
  entity_type text,
  entity_id text,
  retryable boolean not null default false,
  attempt_number integer not null default 1,
  retry_of_id uuid references email_deliveries(id) on delete set null,
  accepted_at timestamptz,
  delivered_at timestamptz,
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_deliveries_audience_check check (audience in ('customer', 'admin', 'internal', 'unknown')),
  constraint email_deliveries_status_check check (
    status in (
      'sending',
      'accepted',
      'delayed',
      'delivered',
      'failed',
      'bounced',
      'complained',
      'suppressed',
      'retrying',
      'retried'
    )
  ),
  constraint email_deliveries_attempt_number_check check (attempt_number between 1 and 5)
);

create index if not exists email_deliveries_created_at_idx
  on email_deliveries(created_at desc);

create index if not exists email_deliveries_status_created_at_idx
  on email_deliveries(status, created_at desc);

create index if not exists email_deliveries_provider_message_id_idx
  on email_deliveries(provider_message_id)
  where provider_message_id is not null;

create index if not exists email_deliveries_entity_idx
  on email_deliveries(entity_type, entity_id, created_at desc)
  where entity_id is not null;

create index if not exists email_deliveries_retry_of_id_idx
  on email_deliveries(retry_of_id)
  where retry_of_id is not null;
