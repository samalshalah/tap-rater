begin;
create table if not exists account_business_drafts (
 business_id uuid not null references businesses(id) on delete cascade,
 customer_id uuid not null references customers(id) on delete cascade,
 draft jsonb not null check (jsonb_typeof(draft)='object'),
 version integer not null default 1 check(version>0),
 updated_at timestamptz not null default now(),
 primary key (business_id,customer_id)
);
alter table account_business_drafts enable row level security;
commit;
