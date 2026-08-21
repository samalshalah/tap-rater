begin;

alter table business_uses
  add column if not exists short_description text not null default '',
  add column if not exists long_content text not null default '',
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists banner_image_url text;

alter table stand_types
  add column if not exists short_description text not null default '',
  add column if not exists long_content text not null default '',
  add column if not exists buyer_intent text not null default '',
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists banner_image_url text;

create index if not exists business_uses_public_sort_idx
  on business_uses(is_active, sort_order, title);

create index if not exists stand_types_public_sort_idx
  on stand_types(is_active, sort_order, title);

commit;
