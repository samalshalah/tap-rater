begin;
alter table hosted_page_editor_pages add column if not exists draft_version integer not null default 0;
create table if not exists customer_stand_registry (
 id uuid primary key default gen_random_uuid(),
 public_id text not null unique default ('ST-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,16))),
 order_id uuid references orders(id) on delete restrict,
 line_id uuid,
 unit_number integer check(unit_number between 1 and 1000),
 device_id uuid unique references devices(id) on delete restrict,
 assignment_customer_id uuid references customers(id) on delete set null,
 draft_business_id uuid references businesses(id) on delete set null,
 draft_label text not null default '',
 assignment_version integer not null default 0,
 created_at timestamptz not null default now(),
 check ((order_id is not null and line_id is not null and unit_number is not null and device_id is null) or (order_id is null and line_id is null and unit_number is null and device_id is not null)),
 unique(order_id,line_id,unit_number)
);
alter table customer_stand_registry enable row level security;
create or replace function preserve_stand_line_identity() returns trigger language plpgsql as $$
declare item jsonb; previous jsonb; result jsonb:='[]'::jsonb; line_key text; seen text[]:=array[]::text[];
begin
 for item in select value from jsonb_array_elements(coalesce(new.line_items_json,'[]'::jsonb)) loop
  line_key:=item->>'standLineId';
  if line_key is null then
   if TG_OP='UPDATE' then
    select value into previous from jsonb_array_elements(coalesce(old.line_items_json,'[]'::jsonb)) where (value-'standLineId')=(item-'standLineId') and not coalesce(value->>'standLineId','')=any(seen) limit 1;
    line_key:=previous->>'standLineId';
    if line_key is null and exists(select 1 from jsonb_array_elements(coalesce(old.line_items_json,'[]'::jsonb)) where value ? 'standLineId') then
     raise exception 'Order items must preserve their permanent standLineId when edited';
    end if;
   end if;
   line_key:=coalesce(line_key,gen_random_uuid()::text);
  end if;
  perform line_key::uuid;
  if line_key=any(seen) then raise exception 'Duplicate standLineId'; end if;
  seen:=array_append(seen,line_key);
  result:=result||jsonb_build_array(item||jsonb_build_object('standLineId',line_key));
 end loop;
 new.line_items_json:=result;return new;
end $$;
create or replace trigger preserve_stand_line_identity before insert or update of line_items_json on orders for each row execute function preserve_stand_line_identity();
update orders set line_items_json=line_items_json where exists(select 1 from jsonb_array_elements(coalesce(line_items_json,'[]'::jsonb)) where not(value ? 'standLineId'));
insert into customer_stand_registry(order_id,line_id,unit_number,public_id)
 select o.id,(i.item->>'standLineId')::uuid,u,'ST-'||o.id||'-'||i.n||'-'||u
 from orders o cross join lateral jsonb_array_elements(o.line_items_json) with ordinality i(item,n)
 cross join lateral generate_series(1,least(1000,greatest(1,coalesce((i.item->>'quantity')::integer,1)))) u
 on conflict(order_id,line_id,unit_number) do nothing;
insert into customer_stand_registry(device_id,public_id) select id,'ST-D-'||device_code from devices on conflict(device_id) do nothing;
create or replace function register_order_stands() returns trigger language plpgsql as $$
begin
 insert into customer_stand_registry(order_id,line_id,unit_number)
 select new.id,(item->>'standLineId')::uuid,u from jsonb_array_elements(new.line_items_json) item
 cross join lateral generate_series(1,least(1000,greatest(1,coalesce((item->>'quantity')::integer,1)))) u
 on conflict(order_id,line_id,unit_number) do nothing;
 return new;
end $$;
create or replace trigger register_order_stands after insert or update of line_items_json on orders for each row execute function register_order_stands();
create or replace function register_device_stand() returns trigger language plpgsql as $$
begin insert into customer_stand_registry(device_id) values(new.id) on conflict(device_id) do nothing;return new;end $$;
create or replace trigger register_device_stand after insert on devices for each row execute function register_device_stand();
commit;
